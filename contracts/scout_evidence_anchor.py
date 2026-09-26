# {"Depends":"py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6"}
"""
ScoutEvidenceAnchor - a GenLayer Intelligent Contract for GenLayer Scout.

A builder anchors a public GenLayer Scout Evidence Manifest v1 claim onchain.
The leader and a set of validators then independently fetch that manifest over
GenLayer-native web access, recompute the Scout payload digest, and reach
equivalence-principle consensus on whether the fetched manifest actually
matches the anchored claim. The settled verdict is written back to onchain state.

It complements the local-first Scout application: Scout still generates,
inspects and stores manifests entirely in the browser, and this contract adds
an independently witnessed, publicly readable record of what a manifest claimed
at a given time.

Determinism boundary:
    - ``anchor_manifest`` is fully deterministic. It validates and stores only.
    - ``verify_anchor`` performs the only non-deterministic work, and it does so
      exclusively inside ``gl.vm.run_nondet_unsafe`` leader/validator functions.

Trust model:
    Anchoring proves nothing. Verification proves only that validators agreed,
    at verification time, that the fetched manifest matched the anchored stable
    fields and digest. It does not prove authorship, ownership, or the
    truthfulness of any supporting claim inside the manifest. See
    ``docs/SCOUT_EVIDENCE_ANCHOR.md``.
"""

import hashlib
import json
from dataclasses import dataclass

import genlayer.gl as gl

from genlayer.py.storage import DynArray, allow_storage
from genlayer.py.types import Address, u32

# --------------------------------------------------------------------------- #
# Scout Evidence Manifest v1 protocol constants (lib/evidence-manifest.ts)
# --------------------------------------------------------------------------- #
MANIFEST_FORMAT = "genlayer-scout-evidence-manifest"
MANIFEST_VERSION = 1
MANIFEST_ALGORITHM = "sha256"
MANIFEST_CANONICALIZATION = "genlayer-scout-json-sorted-keys-v1"

# Scout experiment lifecycle statuses (EXPERIMENT_STATUSES in lib/types.ts)
EXPERIMENT_STATUSES = (
    "drafted",
    "deployed",
    "accepted",
    "consensus",
    "finalized",
    "failed",
)

# --------------------------------------------------------------------------- #
# Anchor verification states
# --------------------------------------------------------------------------- #
STATE_ANCHORED = "ANCHORED"
STATE_VERIFIED = "VERIFIED"
STATE_MISMATCH = "MISMATCH"
STATE_INVALID = "INVALID"
STATE_UNAVAILABLE = "UNAVAILABLE"

# Settled states may never be rewritten; only these two may be retried.
SETTLED_STATES = (STATE_VERIFIED, STATE_MISMATCH, STATE_INVALID)
RETRYABLE_STATES = (STATE_ANCHORED, STATE_UNAVAILABLE)

# MISMATCH reason codes, in deterministic reporting priority order.
REASON_DIGEST_MISMATCH = "DIGEST_MISMATCH"
REASON_TRANSACTION_MISMATCH = "TRANSACTION_MISMATCH"
REASON_ADDRESS_MISMATCH = "ADDRESS_MISMATCH"
REASON_STATUS_MISMATCH = "STATUS_MISMATCH"
REASON_SNAPSHOT_MISMATCH = "SNAPSHOT_MISMATCH"

# INVALID reason codes.
REASON_UNPARSEABLE = "MANIFEST_UNPARSEABLE"
REASON_STRUCTURE = "MANIFEST_STRUCTURE_INVALID"
REASON_FORMAT = "UNSUPPORTED_FORMAT"
REASON_VERSION = "UNSUPPORTED_VERSION"
REASON_ALGORITHM = "UNSUPPORTED_ALGORITHM"
REASON_CANONICALIZATION = "UNSUPPORTED_CANONICALIZATION"
REASON_DIGEST_NOT_COMPUTABLE = "DIGEST_NOT_COMPUTABLE"

# UNAVAILABLE reason code. Used only for web retrieval / read failures.
REASON_WEB_UNAVAILABLE = "WEB_UNAVAILABLE"

# --------------------------------------------------------------------------- #
# Deterministic validation helpers
# --------------------------------------------------------------------------- #
def _to_user_error(msg: str) -> None:
    raise gl.vm.UserError(msg)


HEX_DIGITS = "0123456789abcdefABCDEF"
MAX_SAFE_INTEGER = 9007199254740991
DIGEST_HEX_LENGTH = 64
TRANSACTION_HEX_LENGTH = 66  # "0x" + 64
ADDRESS_HEX_LENGTH = 42  # "0x" + 40
HEX_PREFIX = "0x"
HTTPS_PREFIX = "https://"


def _is_hex_literal(value: str, total_length: int) -> bool:
    """True when ``value`` is exactly ``0x`` + (total_length - 2) hex digits."""
    if not isinstance(value, str) or len(value) != total_length:
        return False
    if value[:2] != HEX_PREFIX:
        return False
    for ch in value[2:]:
        if ch not in HEX_DIGITS:
            return False
    return True


def _is_digest_literal(value: str) -> bool:
    """True when ``value`` is exactly 64 hexadecimal characters (no 0x prefix)."""
    if not isinstance(value, str) or len(value) != DIGEST_HEX_LENGTH:
        return False
    for ch in value:
        if ch not in HEX_DIGITS:
            return False
    return True


def _hex_semantically_equal(left: str, right: str) -> bool:

    """Compare two ``0x``-prefixed hex literals case-insensitively.

    Hexadecimal casing never changes the represented bytes, so ``0xAb..`` and
    ``0xab..`` are the same hash / address. This normalisation is applied ONLY
    to values that really are ``0x``-prefixed hex literals of equal length; any
    other string (including the empty contract address) is compared exactly.
    """
    if len(left) != len(right) or len(left) < 3:
        return left == right
    if left[:2] != HEX_PREFIX or right[:2] != HEX_PREFIX:
        return left == right
    for ch in left[2:] + right[2:]:
        if ch not in HEX_DIGITS:
            return left == right
    return left.lower() == right.lower()


def _is_number(value) -> bool:
    """True for JSON numbers. ``bool`` is deliberately excluded."""
    if isinstance(value, bool):
        return False
    return isinstance(value, int) or isinstance(value, float)


# --------------------------------------------------------------------------- #
# ECMAScript-compatible JSON serialization
#
# Scout's `genlayer-scout-json-sorted-keys-v1` canonicalization is defined in
# terms of JavaScript `JSON.stringify`. Python's `json.dumps` is NOT byte
# equivalent (different separators, different float rendering, `\uXXXX` escapes
# for astral characters), so the string and number writers below reproduce
# `QuoteJSONString` and `Number::toString` directly.
# --------------------------------------------------------------------------- #
_SHORT_ESCAPES = {
    0x08: "\\b",
    0x09: "\\t",
    0x0A: "\\n",
    0x0C: "\\f",
    0x0D: "\\r",
    0x22: '\\"',
    0x5C: "\\\\",
}


def _es_string(value: str) -> str:
    """Port of ECMAScript `QuoteJSONString` (used by `JSON.stringify`)."""
    out = ['"']
    for ch in value:
        code = ord(ch)
        short = _SHORT_ESCAPES.get(code)
        if short is not None:
            out.append(short)
        elif code < 0x20:
            out.append("\\u%04x" % code)
        elif 0xD800 <= code <= 0xDFFF:
            # Well-formed JSON.stringify escapes unpaired surrogates.
            out.append("\\u%04x" % code)
        else:
            out.append(ch)
    out.append('"')
    return "".join(out)


def _es_float_to_string(value: float) -> str:
    """Port of ECMAScript `Number::toString` for finite doubles."""
    if value != value:
        raise ValueError("Evidence manifests cannot contain non-finite numbers.")
    if value == float("inf") or value == float("-inf"):
        raise ValueError("Evidence manifests cannot contain non-finite numbers.")
    if value == 0.0:
        return "0"
    if value < 0.0:
        return "-" + _es_float_to_string(-value)

    # ``repr`` of a Python float is the shortest string that round-trips, which
    # is the same digit selection the ECMAScript algorithm makes.
    text = repr(value)
    if "e" in text:
        mantissa, _, exponent_text = text.partition("e")
        exponent = int(exponent_text)
    else:
        mantissa = text
        exponent = 0

    if "." in mantissa:
        integral, _, fractional = mantissa.partition(".")
    else:
        integral = mantissa
        fractional = ""

    all_digits = integral + fractional
    significant = all_digits.lstrip("0")
    if significant == "":
        return "0"

    # value == significant * 10 ** (exponent - len(fractional)), and the
    # ECMAScript algorithm wants the value as digits * 10 ** (point - length).
    point = len(significant) + exponent - len(fractional)

    digits = significant.rstrip("0")
    if digits == "":
        return "0"
    length = len(digits)

    if length <= point <= 21:
        return digits + "0" * (point - length)
    if 0 < point <= 21:
        return digits[:point] + "." + digits[point:]
    if -6 < point <= 0:
        return "0." + "0" * (-point) + digits

    exp10 = point - 1
    sign = "+" if exp10 >= 0 else "-"
    if length == 1:
        return digits + "e" + sign + str(abs(exp10))
    return digits[0] + "." + digits[1:] + "e" + sign + str(abs(exp10))


def _es_number(value) -> str:
    """Port of `JSON.stringify` for a JSON number."""
    if isinstance(value, int) and not isinstance(value, bool):
        if -MAX_SAFE_INTEGER <= value <= MAX_SAFE_INTEGER:
            return str(value)
        try:
            as_float = float(value)
        except (OverflowError, ValueError):
            raise ValueError("Evidence manifests cannot contain non-finite numbers.")
        return _es_float_to_string(as_float)
    return _es_float_to_string(float(value))


def _utf16_units(value: str) -> list:
    """Key function reproducing JavaScript's UTF-16 code-unit string ordering.

    Python compares strings by code point, JavaScript by UTF-16 code unit. The
    two only differ for astral characters, so surrogate pairs are expanded.
    """
    units = []
    for ch in value:
        code = ord(ch)
        if code >= 0x10000:
            offset = code - 0x10000
            units.append(0xD800 + (offset >> 10))
            units.append(0xDC00 + (offset & 0x3FF))
        else:
            units.append(code)
    return units


def _canonicalize(value) -> str:
    """Serialize JSON with recursively sorted keys and preserved array order.

    This is the contract-side port of ``canonicalizeEvidenceManifestJson``.
    """
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, str):
        return _es_string(value)
    if _is_number(value):
        return _es_number(value)
    if isinstance(value, list):
        parts = []
        for item in value:
            parts.append(_canonicalize(item))
        return "[" + ",".join(parts) + "]"
    if isinstance(value, dict):
        keys = sorted(list(value.keys()), key=_utf16_units)
        parts = []
        for key in keys:
            parts.append(_es_string(key) + ":" + _canonicalize(value[key]))
        return "{" + ",".join(parts) + "}"
    raise ValueError("Evidence manifests can contain JSON values only.")


def _digest_payload(payload) -> str:
    """Lowercase hex SHA-256 of the canonicalized Scout manifest payload."""
    canonical = _canonicalize(payload)
    hasher = hashlib.sha256()
    hasher.update(canonical.encode("utf-8"))
    return hasher.hexdigest()


# --------------------------------------------------------------------------- #
# Consensus observation
#
# `OBSERVATION_FIELDS` is the stable, normalized projection that leader and
# validator must independently derive and then agree on. Raw response bytes and
# human-readable reasons are deliberately excluded: the validators compare
# results, not prose.
# --------------------------------------------------------------------------- #
OBSERVATION_FIELDS = (
    "accessible",
    "parse_ok",
    "format_ok",
    "version_ok",
    "algorithm_ok",
    "canonicalization_ok",
    "structure_ok",
    "digest_computable",
    "manifest_digest",
    "recomputed_digest",
    "transaction_hash",
    "contract_address",
    "recorded_status",
    "snapshot_transaction_hash",
    "snapshot_contract_address",
    "snapshot_manual_status",
)

BOOL_OBSERVATION_FIELDS = (
    "accessible",
    "parse_ok",
    "format_ok",
    "version_ok",
    "algorithm_ok",
    "canonicalization_ok",
    "structure_ok",
    "digest_computable",
)


def _empty_observation() -> dict:
    observation = {}
    for field in OBSERVATION_FIELDS:
        if field in BOOL_OBSERVATION_FIELDS:
            observation[field] = False
        else:
            observation[field] = ""
    return observation


def _observation_is_wellformed(observation) -> bool:
    """Reject anything that is not a complete, correctly typed observation."""
    if not isinstance(observation, dict):
        return False
    for field in OBSERVATION_FIELDS:
        if field not in observation:
            return False
        value = observation[field]
        if field in BOOL_OBSERVATION_FIELDS:
            if not isinstance(value, bool):
                return False
        elif not isinstance(value, str):
            return False
    return True


HEX_OBSERVATION_FIELDS = (
    "manifest_digest",
    "recomputed_digest",
    "transaction_hash",
    "contract_address",
    "snapshot_transaction_hash",
    "snapshot_contract_address",
)


def _observations_agree(left, right) -> bool:
    """True when both observations are well formed and semantically identical.

    Hexadecimal fields are compared case-insensitively, because casing does not
    change the bytes a hash or address represents; the observations themselves
    keep the original casing for onchain storage. Everything else (the boolean
    outcomes and the Scout status strings) is compared exactly.
    """
    if not _observation_is_wellformed(left) or not _observation_is_wellformed(right):
        return False
    for field in OBSERVATION_FIELDS:
        if field in HEX_OBSERVATION_FIELDS:
            if not _hex_semantically_equal(left[field], right[field]):
                return False
        elif left[field] != right[field]:
            return False
    return True



def _structure_ok(payload, integrity) -> bool:
    """Type-level check of the manifest fields the observation depends on."""
    if not isinstance(payload, dict) or not isinstance(integrity, dict):
        return False

    if not isinstance(integrity.get("algorithm"), str):
        return False
    if not isinstance(integrity.get("canonicalization"), str):
        return False
    if not _is_digest_literal(integrity.get("digest")):
        return False

    if not _is_number(payload.get("version")):
        return False
    if not isinstance(payload.get("generator"), dict):
        return False
    if not isinstance(payload.get("contributionContext"), dict):
        return False
    if not isinstance(payload.get("supportingEvidence"), dict):
        return False

    references = payload.get("implementationReferences")
    if not isinstance(references, dict):
        return False
    if not isinstance(references.get("transactionHash"), str):
        return False
    if not isinstance(references.get("deployedContractAddress"), str):
        return False

    details = payload.get("experimentDetails")
    if not isinstance(details, dict):
        return False
    if not isinstance(details.get("status"), str):
        return False

    verification = payload.get("verification")
    if not isinstance(verification, dict):
        return False
    snapshot = verification.get("snapshot")
    if not isinstance(snapshot, dict):
        return False
    if not isinstance(snapshot.get("transactionHash"), str):
        return False
    if not isinstance(snapshot.get("contractAddress"), str):
        return False
    if not isinstance(snapshot.get("manualStatus"), str):
        return False

    return True


def _observe_document(text: str) -> dict:
    """Parse a fetched manifest body into a normalized observation.

    This performs no network access and no storage access, so the same
    function runs identically on the leader and inside every validator.
    """
    observation = _empty_observation()
    observation["accessible"] = True

    try:
        envelope = json.loads(text)
    except Exception:
        return observation

    observation["parse_ok"] = True

    if not isinstance(envelope, dict):
        return observation

    fmt = envelope.get("format")
    observation["format_ok"] = isinstance(fmt, str) and fmt == MANIFEST_FORMAT

    payload = envelope.get("payload")
    integrity = envelope.get("integrity")

    if not _structure_ok(payload, integrity):
        return observation

    observation["structure_ok"] = True

    version = payload.get("version")
    observation["version_ok"] = float(version) == float(MANIFEST_VERSION)
    observation["algorithm_ok"] = integrity.get("algorithm") == MANIFEST_ALGORITHM
    observation["canonicalization_ok"] = (
        integrity.get("canonicalization") == MANIFEST_CANONICALIZATION
    )

    digest = integrity.get("digest")
    observation["manifest_digest"] = digest.lower()

    try:
        recomputed = _digest_payload(payload)
    except Exception:
        recomputed = ""
    if recomputed != "":
        observation["digest_computable"] = True
        observation["recomputed_digest"] = recomputed

    references = payload.get("implementationReferences")
    observation["transaction_hash"] = references.get("transactionHash")
    observation["contract_address"] = references.get("deployedContractAddress")
    observation["recorded_status"] = payload.get("experimentDetails").get("status")

    snapshot = payload.get("verification").get("snapshot")
    observation["snapshot_transaction_hash"] = snapshot.get("transactionHash")
    observation["snapshot_contract_address"] = snapshot.get("contractAddress")
    observation["snapshot_manual_status"] = snapshot.get("manualStatus")

    return observation


def _classify(observation: dict, claim: dict) -> tuple:
    """Derive the onchain verdict from an observation and the anchored claim.

    Pure and deterministic. The leader's conclusion is never trusted: this
    same function runs again on the stored observation, and every validator
    runs it against its own independent observation.
    """
    if not observation.get("accessible"):
        return STATE_UNAVAILABLE, REASON_WEB_UNAVAILABLE
    if not observation.get("parse_ok"):
        return STATE_INVALID, REASON_UNPARSEABLE
    if not observation.get("structure_ok"):
        return STATE_INVALID, REASON_STRUCTURE
    if not observation.get("format_ok"):
        return STATE_INVALID, REASON_FORMAT
    if not observation.get("version_ok"):
        return STATE_INVALID, REASON_VERSION
    if not observation.get("algorithm_ok"):
        return STATE_INVALID, REASON_ALGORITHM
    if not observation.get("canonicalization_ok"):
        return STATE_INVALID, REASON_CANONICALIZATION
    if not observation.get("digest_computable"):
        return STATE_INVALID, REASON_DIGEST_NOT_COMPUTABLE

    recomputed = observation.get("recomputed_digest", "")
    if recomputed != observation.get("manifest_digest", ""):
        return STATE_MISMATCH, REASON_DIGEST_MISMATCH
    if recomputed != claim["claimed_digest"]:
        return STATE_MISMATCH, REASON_DIGEST_MISMATCH

    if not _hex_semantically_equal(
        observation.get("transaction_hash", ""), claim["transaction_hash"]
    ):
        return STATE_MISMATCH, REASON_TRANSACTION_MISMATCH

    if not _hex_semantically_equal(
        observation.get("contract_address", ""), claim["contract_address"]
    ):
        return STATE_MISMATCH, REASON_ADDRESS_MISMATCH

    if observation.get("recorded_status", "") != claim["recorded_status"]:
        return STATE_MISMATCH, REASON_STATUS_MISMATCH

    if not _hex_semantically_equal(
        observation.get("snapshot_transaction_hash", ""), claim["transaction_hash"]
    ):
        return STATE_MISMATCH, REASON_SNAPSHOT_MISMATCH

    if not _hex_semantically_equal(
        observation.get("snapshot_contract_address", ""), claim["contract_address"]
    ):
        return STATE_MISMATCH, REASON_SNAPSHOT_MISMATCH

    if observation.get("snapshot_manual_status", "") != claim["recorded_status"]:
        return STATE_MISMATCH, REASON_SNAPSHOT_MISMATCH

    return STATE_VERIFIED, ""


# --------------------------------------------------------------------------- #
# Storage
# --------------------------------------------------------------------------- #
@allow_storage
@dataclass
class Anchor:
    """One anchored manifest claim plus the latest consensus observation."""

    anchor_id: u32
    submitter: Address
    manifest_url: str
    claimed_digest: str
    transaction_hash: str
    contract_address: str
    recorded_status: str
    verification_state: str
    observed_digest: str
    observed_transaction_hash: str
    observed_contract_address: str
    observed_status: str
    reason_code: str


class ScoutEvidenceAnchor(gl.Contract):
    """Onchain registry of Scout Evidence Manifest v1 claims."""

    anchors: DynArray[Anchor]

    def __init__(self):
        self.anchors = []

    # ------------------------------------------------------------------ #
    # Deterministic write path
    # ------------------------------------------------------------------ #
    @gl.public.write
    def anchor_manifest(
        self,
        manifest_url: str,
        claimed_digest: str,
        transaction_hash: str,
        contract_address: str,
        recorded_status: str,
    ) -> int:
        """Anchor a public Scout Evidence Manifest v1 claim.

        Deterministic: validates and stores only. It never touches the network,
        an LLM, or any non-deterministic source.

        Returns the new anchor id. Anchor ids are sequential integers starting
        at 1.
        """
        url = manifest_url.strip() if isinstance(manifest_url, str) else ""
        if not url.lower().startswith(HTTPS_PREFIX) or len(url) <= len(HTTPS_PREFIX):
            _to_user_error("manifest_url must be an https:// URL")

        digest = claimed_digest.strip() if isinstance(claimed_digest, str) else ""
        if not _is_digest_literal(digest):
            _to_user_error("claimed_digest must be 64 hexadecimal characters")

        tx_hash = transaction_hash.strip() if isinstance(transaction_hash, str) else ""
        if not _is_hex_literal(tx_hash, TRANSACTION_HEX_LENGTH):
            _to_user_error("transaction_hash must be 0x followed by 64 hex characters")

        address = contract_address.strip() if isinstance(contract_address, str) else ""
        if address != "" and not _is_hex_literal(address, ADDRESS_HEX_LENGTH):
            _to_user_error(
                "contract_address must be empty or 0x followed by 40 hex characters"
            )

        status = recorded_status.strip() if isinstance(recorded_status, str) else ""
        if status not in EXPERIMENT_STATUSES:
            _to_user_error(
                "recorded_status must be one of: " + ", ".join(EXPERIMENT_STATUSES)
            )

        anchor_id = u32(len(self.anchors) + 1)
        self.anchors.append(
            Anchor(
                anchor_id=anchor_id,
                submitter=gl.message.sender_address,
                manifest_url=url,
                # Digests are hexadecimal, so they are stored canonically. The
                # original casing of hashes and addresses is preserved as-is.
                claimed_digest=digest.lower(),
                transaction_hash=tx_hash,
                contract_address=address,
                recorded_status=status,
                verification_state=STATE_ANCHORED,
                observed_digest="",
                observed_transaction_hash="",
                observed_contract_address="",
                observed_status="",
                reason_code="",
            )
        )
        return int(anchor_id)

    # ------------------------------------------------------------------ #
    # Non-deterministic verification
    # ------------------------------------------------------------------ #
    @gl.public.write
    def verify_anchor(self, anchor_id: int):
        """Verify an anchor through GenLayer leader/validator consensus.

        The leader and every validator independently fetch the public manifest
        with ``gl.nondet.web.get`` and independently derive a normalized
        observation from it. Consensus is reached only when every validator's
        observation matches the leader's observation field for field.

        Only ANCHORED and UNAVAILABLE anchors can be verified. A settled
        VERIFIED / MISMATCH / INVALID anchor is never rewritten.
        """
        if not isinstance(anchor_id, int) or isinstance(anchor_id, bool):
            _to_user_error("anchor_id must be an integer")
        if anchor_id < 1 or anchor_id > len(self.anchors):
            _to_user_error("unknown anchor id")

        anchor = self.anchors[anchor_id - 1]
        state = anchor.verification_state
        if state not in RETRYABLE_STATES:
            _to_user_error(
                "anchor "
                + str(anchor_id)
                + " is already settled as "
                + state
                + " and cannot be verified again"
            )

        # Storage is unavailable inside non-deterministic blocks, so the claim
        # is snapshotted into plain data before consensus runs.
        claim = {
            "claimed_digest": anchor.claimed_digest,
            "transaction_hash": anchor.transaction_hash,
            "contract_address": anchor.contract_address,
            "recorded_status": anchor.recorded_status,
        }
        url = anchor.manifest_url

        observation = self._exec_consensus(url, claim)
        self._apply_observation(anchor_id, observation, claim)

    def _exec_consensus(self, url: str, claim: dict) -> dict:
        """Run the leader/validator equivalence check and return the leader result.

        Uses ``run_nondet_unsafe``: the validator runs without an extra error
        sandbox, so it must be fully defensive. Any validator-side failure is
        converted to ``False`` (disagreement) rather than leaking an exception.
        """

        def leader_fn():
            return self._observe_manifest(url)

        def validator_fn(leaders_res):
            try:
                if not isinstance(leaders_res, gl.vm.Return):
                    return False
                leader_observation = leaders_res.calldata
                my_observation = self._observe_manifest(url)
                return _observations_agree(leader_observation, my_observation)
            except Exception:
                return False

        result = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)
        # Production returns Lazy[T]; Direct Mode returns the raw value.
        from genlayer.py.types import Lazy as _Lazy

        if isinstance(result, _Lazy):
            result = result.get()
        return result

    def _observe_manifest(self, url: str) -> dict:
        """Leader and validator both call this: fetch, parse, normalize.

        Uses only GenLayer-native web access. No HTTP client library is
        involved, and no LLM is involved.
        """
        try:
            response = gl.nondet.web.get(url)
        except Exception:
            return _empty_observation()

        try:
            status = int(response.status)
            body = response.body
        except Exception:
            return _empty_observation()

        if status >= 400 or body is None:
            return _empty_observation()

        if isinstance(body, bytes):
            try:
                text = body.decode("utf-8")
            except Exception:
                return _empty_observation()
        else:
            text = str(body)

        return _observe_document(text)

    def _apply_observation(self, anchor_id: int, observation, claim: dict) -> None:
        """Deterministically settle the anchor from the consensus observation."""
        if not _observation_is_wellformed(observation):
            _to_user_error("consensus produced a malformed observation")

        state, reason = _classify(observation, claim)

        anchor = self.anchors[anchor_id - 1]
        anchor.verification_state = state
        anchor.reason_code = reason
        anchor.observed_digest = observation["recomputed_digest"]
        anchor.observed_transaction_hash = observation["transaction_hash"]
        anchor.observed_contract_address = observation["contract_address"]
        anchor.observed_status = observation["recorded_status"]

    # ------------------------------------------------------------------ #
    # Read-only views
    # ------------------------------------------------------------------ #
    @gl.public.view
    def get_anchor(self, anchor_id: int) -> dict:
        """Return the full anchor record, or an empty record if unknown."""
        if not isinstance(anchor_id, int) or isinstance(anchor_id, bool):
            _to_user_error("anchor_id must be an integer")
        if anchor_id < 1 or anchor_id > len(self.anchors):
            _to_user_error("unknown anchor id")
        anchor = self.anchors[anchor_id - 1]
        return {
            "anchor_id": int(anchor.anchor_id),
            "submitter": anchor.submitter,
            "manifest_url": anchor.manifest_url,
            "claimed_digest": anchor.claimed_digest,
            "transaction_hash": anchor.transaction_hash,
            "contract_address": anchor.contract_address,
            "recorded_status": anchor.recorded_status,
            "verification_state": anchor.verification_state,
            "observed_digest": anchor.observed_digest,
            "observed_transaction_hash": anchor.observed_transaction_hash,
            "observed_contract_address": anchor.observed_contract_address,
            "observed_status": anchor.observed_status,
            "reason_code": anchor.reason_code,
        }

    @gl.public.view
    def get_anchor_count(self) -> int:
        """Number of anchors recorded so far. The next anchor id is this + 1."""
        return len(self.anchors)

    @gl.public.view
    def get_anchor_state(self, anchor_id: int) -> str:
        """Current verification state of an anchor."""
        if not isinstance(anchor_id, int) or isinstance(anchor_id, bool):
            _to_user_error("anchor_id must be an integer")
        if anchor_id < 1 or anchor_id > len(self.anchors):
            _to_user_error("unknown anchor id")
        return self.anchors[anchor_id - 1].verification_state

    @gl.public.view
    def get_anchor_ids_by_submitter(self, submitter: str) -> list:
        """Anchor ids submitted by an address, oldest first.

        A linear scan over the append-only array. No secondary index is
        maintained on purpose: the array is the only source of truth.
        """
        try:
            wanted = Address(submitter)
        except Exception:
            _to_user_error("submitter must be a 0x-prefixed 20-byte address")

        found = []
        for index in range(len(self.anchors)):
            anchor = self.anchors[index]
            if _hex_semantically_equal(anchor.submitter.as_hex, wanted.as_hex):
                found.append(int(anchor.anchor_id))
        return found

    @gl.public.view
    def supported_manifest_profile(self) -> dict:
        """The Scout manifest profile this contract version will verify."""
        return {
            "format": MANIFEST_FORMAT,
            "payload_version": MANIFEST_VERSION,
            "algorithm": MANIFEST_ALGORITHM,
            "canonicalization": MANIFEST_CANONICALIZATION,
            "experiment_statuses": list(EXPERIMENT_STATUSES),
            "states": [
                STATE_ANCHORED,
                STATE_VERIFIED,
                STATE_MISMATCH,
                STATE_INVALID,
                STATE_UNAVAILABLE,
            ],
        }

    # ------------------------------------------------------------------ #
    # Canonicalization diagnostics
    #
    # Pure, offline views. They exist so that independent tooling (and the
    # Direct-Mode golden-vector tests) can ask this contract to canonicalize or
    # digest a payload using exactly the code the consensus path uses.
    # ------------------------------------------------------------------ #
    @gl.public.view
    def canonicalize_payload(self, payload_json: str) -> str:
        """Canonicalize a payload given as JSON text. Returns "" on any error."""
        try:
            payload = json.loads(payload_json)
        except Exception:
            return ""
        try:
            return _canonicalize(payload)
        except Exception:
            return ""

    @gl.public.view
    def recompute_payload_digest(self, payload_json: str) -> str:
        """Recompute the Scout payload digest for JSON text. "" on any error."""
        try:
            payload = json.loads(payload_json)
        except Exception:
            return ""
        try:
            return _digest_payload(payload)
        except Exception:
            return ""

