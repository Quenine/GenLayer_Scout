"""Direct-Mode tests for contracts/scout_evidence_anchor.py.

Everything here runs the real deployed contract through the GenLayer SDK in
Direct Mode: calldata encoding, storage decorators, and (for verification) the
leader/validator consensus entry point.

Golden digest expectations were produced by the Scout TypeScript canonicalizer
(`canonicalizeEvidenceManifestJson`) and hashed with Node's built-in
``node:crypto`` SHA-256. See ``tests/fixtures/evidence-manifest/README.md``.
"""

import copy
import json
import os
import re

import cloudpickle
import pytest

FIXTURE_DIR = os.path.join(os.path.dirname(__file__), "..", "fixtures", "evidence-manifest")

# Standard SHA-256 over the canonical payload, computed with node:crypto.
GOLDEN_DIGESTS = {
    "verified.json": "041c5603ac42c99de7a0331f2e0f09ba0467b7963b76cab5aecfe9a6ddda8321",
    "mixed-case.json": "8d4913e76c34ee7e62441a2203e4b904f04841810a9d331b9600e6e7b50ca48f",
    "unicode.json": "ad7aff059bd82f8a8145b64d025ea22cf94dc389939b46d7af8d6f92f8ba7c60",
    "no-experiment.json": "36accee46c1cb91aff429ccfbc7edd168ff8e4cc86bd7cb8cecf67e5bf45d9ef",
}

TX_LOWER = "0x" + "a" * 64
ADDR_LOWER = "0x" + "b" * 40
STATUS = "finalized"
MANIFEST_URL = "https://evidence.example.test/manifests/verified.json"


def load_fixture(name):
    with open(os.path.join(FIXTURE_DIR, name), "r", encoding="utf-8") as handle:
        return json.load(handle)


def serve(direct_vm, url, body, status=200):
    """Register a web mock for an exact URL."""
    direct_vm.mock_web(re.escape(url), {"method": "GET", "status": status, "body": body})


def body_of(envelope):
    return json.dumps(envelope, ensure_ascii=True)


def reseal(c, envelope):
    """Recompute ``integrity.digest`` after mutating a payload.

    Without this, any payload edit also breaks integrity and the contract
    (correctly) reports DIGEST_MISMATCH before it ever reaches the field under
    test.
    """
    envelope["integrity"]["digest"] = c.recompute_payload_digest(body_of(envelope["payload"]))
    return envelope


def anchor_for(c, envelope, url=MANIFEST_URL, **overrides):
    """Anchor a claim that matches ``envelope`` unless overridden.

    The claimed digest is whatever this contract independently computes for the
    envelope's *payload* (the manifest protocol digests the payload only, not
    the wrapper), so digest *equality* is established and any test that wants a
    digest mismatch can simply override it.
    """
    digest = c.recompute_payload_digest(body_of(envelope["payload"]))
    claim = {
        "claimed_digest": digest,
        "transaction_hash": TX_LOWER,
        "contract_address": ADDR_LOWER,
        "recorded_status": STATUS,
    }
    claim.update(overrides)
    return c.anchor_manifest(
        url,
        claim["claimed_digest"],
        claim["transaction_hash"],
        claim["contract_address"],
        claim["recorded_status"],
    )


# --------------------------------------------------------------------------- #
# Canonicalization and digesting
# --------------------------------------------------------------------------- #
@pytest.mark.parametrize("name,expected", sorted(GOLDEN_DIGESTS.items()))
def test_digest_matches_reference_sha256(deploy_contract, name, expected):
    c = deploy_contract()
    payload = load_fixture(name)["payload"]
    assert c.recompute_payload_digest(body_of(payload)) == expected


@pytest.mark.parametrize("name", sorted(GOLDEN_DIGESTS))
def test_fixture_integrity_digest_is_the_golden_digest(name):
    """The fixture's own ``integrity.digest`` must equal the golden digest.

    This keeps the fixtures honest in both directions: the digest recomputed
    from the payload, and the digest published in the wrapper, are the same
    value. See ``tests/fixtures/evidence-manifest/README.md``.
    """
    envelope = load_fixture(name)
    assert envelope["integrity"]["digest"] == GOLDEN_DIGESTS[name]


def test_non_standard_sha256_digest_is_rejected(deploy_contract, direct_vm):
    """A manifest whose digest is not standard SHA-256 cannot be verified.

    ``lib/sha256.ts`` in the Scout app is a hand-rolled SHA-256 that agrees with
    ``node:crypto`` for the empty string only; its round constants and IV match
    the spec but its output diverges for every non-empty input. The manifest
    protocol declares ``algorithm: "sha256"``, so this contract recomputes
    standard SHA-256, and a manifest carrying the app's current digest is
    correctly reported as a mismatch rather than silently accepted.

    This test is the regression guard for that frontend defect: it pins the
    exact value the app currently emits, so the day ``lib/sha256.ts`` is fixed
    the failure is unambiguous.
    """
    c = deploy_contract()
    envelope = load_fixture("verified.json")
    broken = "946544e1b7ed34791c216e16390a81b718dd4e938050653a9f5eab8246d11ac8"
    envelope["integrity"]["digest"] = broken
    anchor_id = anchor_for(c, envelope, claimed_digest=broken)
    serve(direct_vm, MANIFEST_URL, body_of(envelope))

    c.verify_anchor(anchor_id)

    assert c.get_anchor_state(anchor_id) == "MISMATCH"
    assert c.get_anchor(anchor_id)["reason_code"] == "DIGEST_MISMATCH"
    # The anchor's own digest is what the contract actually recomputed.
    assert c.get_anchor(anchor_id)["observed_digest"] == GOLDEN_DIGESTS["verified.json"]


def test_canonicalization_ignores_object_key_order(deploy_contract):
    c = deploy_contract()
    payload = load_fixture("verified.json")["payload"]

    def reverse_keys(value):
        if isinstance(value, dict):
            return {k: reverse_keys(value[k]) for k in reversed(list(value.keys()))}
        if isinstance(value, list):
            return [reverse_keys(item) for item in value]
        return value

    assert c.recompute_payload_digest(body_of(reverse_keys(payload))) == c.recompute_payload_digest(
        body_of(payload)
    )


def test_canonicalization_preserves_array_order(deploy_contract):
    c = deploy_contract()
    first = c.recompute_payload_digest('{"a":[1,2,3]}')
    second = c.recompute_payload_digest('{"a":[3,2,1]}')
    assert first != second
    assert first == c.recompute_payload_digest('{"a":[1,2,3]}')


@pytest.mark.parametrize(
    "text,expected",
    [
        # Integers and integer-valued floats collapse to the same JSON number.
        ("1", "1"),
        ("1.0", "1"),
        ("100", "100"),
        ("-0.0", "0"),
        ("0", "0"),
        # ECMAScript Number::toString switches to exponential form outside
        # 1e-7 < |x| and |x| < 1e21.
        ("1.5", "1.5"),
        ("-1.5", "-1.5"),
        ("0.30000000000000004", "0.30000000000000004"),
        ("1e21", "1e+21"),
        ("1e-7", "1e-7"),
        ("1e-6", "0.000001"),
        # Integers outside the safe range round through a double first.
        ("9007199254740991", "9007199254740991"),
        ("123456789012345678", "123456789012345680"),
    ],
)
def test_canonicalization_matches_ecmascript_number_formatting(deploy_contract, text, expected):
    c = deploy_contract()
    assert c.canonicalize_payload(text) == expected


@pytest.mark.parametrize(
    "text,expected",
    [
        # Only the JSON-mandated escapes plus \u007f stay escaped.
        (r'"\u0000\u001f"', r'"\u0000\u001f"'),
        (r'"\u007f"', '"\u007f"'),
        (r'"\b\f\n\r\t\"\\"', r'"\b\f\n\r\t\"\\"'),
        # Non-ASCII is emitted literally.
        (r'"\u00e9\u2192"', '"\u00e9\u2192"'),
        # Surrogate pairs decode to one astral character.
        (r'"\ud83d\ude00"', '"\U0001f600"'),
        # A lone surrogate is preserved and re-escaped, as JSON.stringify does.
        (r'"\ud83d"', r'"\ud83d"'),
        (r'"\/"', '"/"'),
    ],
)
def test_canonicalization_matches_ecmascript_string_escaping(deploy_contract, text, expected):
    c = deploy_contract()
    assert c.canonicalize_payload(text) == expected


def test_canonicalize_payload_returns_empty_for_unparseable_text(deploy_contract):
    c = deploy_contract()
    assert c.canonicalize_payload("{not json") == ""


def test_recompute_payload_digest_returns_empty_for_unparseable_text(deploy_contract):
    c = deploy_contract()
    assert c.recompute_payload_digest("{not json") == ""


def test_supported_manifest_profile(deploy_contract):
    c = deploy_contract()
    profile = c.supported_manifest_profile()
    assert profile["format"] == "genlayer-scout-evidence-manifest"
    assert profile["payload_version"] == 1
    assert profile["algorithm"] == "sha256"
    assert profile["canonicalization"] == "genlayer-scout-json-sorted-keys-v1"
    assert profile["states"] == [
        "ANCHORED",
        "VERIFIED",
        "MISMATCH",
        "INVALID",
        "UNAVAILABLE",
    ]
    assert profile["experiment_statuses"] == [
        "drafted",
        "deployed",
        "accepted",
        "consensus",
        "finalized",
        "failed",
    ]


# --------------------------------------------------------------------------- #
# anchor_manifest: deterministic write path
# --------------------------------------------------------------------------- #
def test_anchor_manifest_records_the_claim(deploy_contract, direct_alice):
    c = deploy_contract()
    digest = "A" * 64
    tx_hash = "0x" + "Ab" * 32
    address = "0x" + "Cd" * 20

    anchor_id = c.anchor_manifest(MANIFEST_URL, digest, tx_hash, address, "consensus")

    assert anchor_id == 1
    assert c.get_anchor_count() == 1
    assert c.get_anchor_state(1) == "ANCHORED"

    anchor = c.get_anchor(1)
    assert anchor["anchor_id"] == 1
    assert anchor["manifest_url"] == MANIFEST_URL
    # Digests are hexadecimal, so they normalize to lowercase.
    assert anchor["claimed_digest"] == digest.lower()
    # Hash and address casing is preserved exactly as submitted.
    assert anchor["transaction_hash"] == tx_hash
    assert anchor["contract_address"] == address
    assert anchor["recorded_status"] == "consensus"
    assert anchor["verification_state"] == "ANCHORED"
    assert anchor["reason_code"] == ""
    assert anchor["observed_digest"] == ""
    assert anchor["observed_transaction_hash"] == ""
    assert anchor["observed_contract_address"] == ""
    assert anchor["observed_status"] == ""


def test_anchor_ids_are_sequential_from_one(deploy_contract):
    c = deploy_contract()
    for expected in range(1, 6):
        assert (
            c.anchor_manifest(MANIFEST_URL, "a" * 64, TX_LOWER, ADDR_LOWER, STATUS) == expected
        )
    assert c.get_anchor_count() == 5


def test_anchor_manifest_accepts_empty_contract_address(deploy_contract):
    c = deploy_contract()
    assert c.anchor_manifest(MANIFEST_URL, "a" * 64, TX_LOWER, "", STATUS) == 1
    assert c.get_anchor(1)["contract_address"] == ""


def test_anchor_manifest_rejects_non_https_urls(deploy_contract):
    c = deploy_contract()
    for url in ["http://x.test/m.json", "ftp://x.test/m.json", "https://", "", "x.test/m.json"]:
        with pytest.raises(Exception, match="https"):
            c.anchor_manifest(url, "a" * 64, TX_LOWER, ADDR_LOWER, STATUS)


@pytest.mark.parametrize(
    "digest", ["", "a" * 63, "a" * 65, "g" * 64, "0x" + "a" * 64, " " + "a" * 63 + " "]
)
def test_anchor_manifest_rejects_bad_digests(deploy_contract, digest):
    c = deploy_contract()
    with pytest.raises(Exception, match="64 hexadecimal"):
        c.anchor_manifest(MANIFEST_URL, digest, TX_LOWER, ADDR_LOWER, STATUS)


@pytest.mark.parametrize(
    "tx_hash",
    ["", "a" * 64, "0x" + "a" * 63, "0x" + "a" * 65, "0x" + "z" * 64, "0X" + "a" * 64],
)
def test_anchor_manifest_rejects_bad_transaction_hashes(deploy_contract, tx_hash):
    c = deploy_contract()
    with pytest.raises(Exception, match="64 hex characters"):
        c.anchor_manifest(MANIFEST_URL, "a" * 64, tx_hash, ADDR_LOWER, STATUS)


@pytest.mark.parametrize("address", ["0x" + "b" * 39, "0x" + "b" * 41, "0x" + "z" * 40, "b" * 40])
def test_anchor_manifest_rejects_bad_contract_addresses(deploy_contract, address):
    c = deploy_contract()
    with pytest.raises(Exception, match="40 hex characters"):
        c.anchor_manifest(MANIFEST_URL, "a" * 64, TX_LOWER, address, STATUS)


@pytest.mark.parametrize("status", ["", "FINALIZED", "done", "unknown"])
def test_anchor_manifest_rejects_unsupported_statuses(deploy_contract, status):
    c = deploy_contract()
    with pytest.raises(Exception, match="recorded_status"):
        c.anchor_manifest(MANIFEST_URL, "a" * 64, TX_LOWER, ADDR_LOWER, status)


def test_unknown_anchor_id_is_rejected_by_every_reader(deploy_contract):
    c = deploy_contract()
    with pytest.raises(Exception, match="unknown anchor id"):
        c.get_anchor(1)
    with pytest.raises(Exception, match="unknown anchor id"):
        c.get_anchor_state(1)
    with pytest.raises(Exception, match="unknown anchor id"):
        c.verify_anchor(1)
    with pytest.raises(Exception, match="unknown anchor id"):
        c.get_anchor(0)


def test_non_integer_anchor_id_is_rejected(deploy_contract):
    c = deploy_contract()
    c.anchor_manifest(MANIFEST_URL, "a" * 64, TX_LOWER, ADDR_LOWER, STATUS)
    with pytest.raises(Exception, match="anchor_id must be an integer"):
        c.get_anchor("1")
    with pytest.raises(Exception, match="anchor_id must be an integer"):
        c.verify_anchor("1")


def test_anchor_manifest_uses_no_network(deploy_contract):
    """Anchoring is deterministic, so it must not need web or LLM access.

    The suite-wide strict-mock fixture makes any unmocked network access raise,
    so simply anchoring succeeding is the assertion.
    """
    c = deploy_contract()
    assert c.anchor_manifest(MANIFEST_URL, "a" * 64, TX_LOWER, ADDR_LOWER, STATUS) == 1


# --------------------------------------------------------------------------- #
# verify_anchor: classification outcomes
# --------------------------------------------------------------------------- #
def test_matching_manifest_verifies(deploy_contract, direct_vm):
    c = deploy_contract()
    envelope = load_fixture("verified.json")
    anchor_id = anchor_for(c, envelope)
    serve(direct_vm, MANIFEST_URL, body_of(envelope))

    c.verify_anchor(anchor_id)

    anchor = c.get_anchor(anchor_id)
    assert anchor["verification_state"] == "VERIFIED"
    assert anchor["reason_code"] == ""
    assert anchor["observed_digest"] == c.recompute_payload_digest(body_of(envelope["payload"]))
    assert anchor["observed_transaction_hash"] == TX_LOWER
    assert anchor["observed_contract_address"] == ADDR_LOWER
    assert anchor["observed_status"] == STATUS


def test_hexadecimal_casing_does_not_affect_verification(deploy_contract, direct_vm):
    """Casing is preserved onchain but compared case-insensitively."""
    c = deploy_contract()
    envelope = load_fixture("verified.json")
    payload = copy.deepcopy(envelope["payload"])

    upper_tx = "0x" + "A" * 64
    upper_addr = "0x" + "B" * 40
    payload["implementationReferences"]["transactionHash"] = upper_tx
    payload["implementationReferences"]["deployedContractAddress"] = upper_addr
    payload["verification"]["snapshot"]["transactionHash"] = upper_tx
    payload["verification"]["snapshot"]["contractAddress"] = upper_addr
    envelope["payload"] = payload
    reseal(c, envelope)

    # The claim is anchored in lowercase; the manifest serves uppercase.
    anchor_id = anchor_for(c, envelope)
    serve(direct_vm, MANIFEST_URL, body_of(envelope))

    c.verify_anchor(anchor_id)

    anchor = c.get_anchor(anchor_id)
    assert anchor["verification_state"] == "VERIFIED"
    # The manifest's original casing is what gets stored.
    assert anchor["observed_transaction_hash"] == upper_tx
    assert anchor["observed_contract_address"] == upper_addr
    # The anchor keeps the casing it was submitted with.
    assert anchor["transaction_hash"] == TX_LOWER


def test_digest_mismatch(deploy_contract, direct_vm):
    c = deploy_contract()
    envelope = load_fixture("verified.json")
    anchor_id = anchor_for(c, envelope, claimed_digest="f" * 64)
    serve(direct_vm, MANIFEST_URL, body_of(envelope))

    c.verify_anchor(anchor_id)

    assert c.get_anchor_state(anchor_id) == "MISMATCH"
    assert c.get_anchor(anchor_id)["reason_code"] == "DIGEST_MISMATCH"


def test_manifest_digest_does_not_match_its_own_payload(deploy_contract, direct_vm):
    """A tampered ``integrity.digest`` is caught even when the claim agrees."""
    c = deploy_contract()
    envelope = load_fixture("verified.json")
    good_digest = c.recompute_payload_digest(body_of(envelope["payload"]))
    envelope["integrity"]["digest"] = "0" * 64
    anchor_id = anchor_for(c, envelope, claimed_digest=good_digest)
    serve(direct_vm, MANIFEST_URL, body_of(envelope))

    c.verify_anchor(anchor_id)

    assert c.get_anchor_state(anchor_id) == "MISMATCH"
    assert c.get_anchor(anchor_id)["reason_code"] == "DIGEST_MISMATCH"


def test_transaction_mismatch(deploy_contract, direct_vm):
    c = deploy_contract()
    envelope = load_fixture("verified.json")
    anchor_id = anchor_for(c, envelope, transaction_hash="0x" + "c" * 64)
    serve(direct_vm, MANIFEST_URL, body_of(envelope))

    c.verify_anchor(anchor_id)

    assert c.get_anchor_state(anchor_id) == "MISMATCH"
    assert c.get_anchor(anchor_id)["reason_code"] == "TRANSACTION_MISMATCH"


def test_contract_address_mismatch(deploy_contract, direct_vm):
    c = deploy_contract()
    envelope = load_fixture("verified.json")
    anchor_id = anchor_for(c, envelope, contract_address="0x" + "d" * 40)
    serve(direct_vm, MANIFEST_URL, body_of(envelope))

    c.verify_anchor(anchor_id)

    assert c.get_anchor_state(anchor_id) == "MISMATCH"
    assert c.get_anchor(anchor_id)["reason_code"] == "ADDRESS_MISMATCH"


def test_status_mismatch(deploy_contract, direct_vm):
    c = deploy_contract()
    envelope = load_fixture("verified.json")
    anchor_id = anchor_for(c, envelope, recorded_status="accepted")
    serve(direct_vm, MANIFEST_URL, body_of(envelope))

    c.verify_anchor(anchor_id)

    assert c.get_anchor_state(anchor_id) == "MISMATCH"
    assert c.get_anchor(anchor_id)["reason_code"] == "STATUS_MISMATCH"


@pytest.mark.parametrize(
    "field,value",
    [
        ("transactionHash", "0x" + "e" * 64),
        ("contractAddress", "0x" + "f" * 40),
        ("manualStatus", "rejected"),
    ],
)
def test_snapshot_mismatch(deploy_contract, direct_vm, field, value):
    """The verification snapshot must agree with the anchor too."""
    c = deploy_contract()
    envelope = load_fixture("verified.json")
    envelope["payload"]["verification"]["snapshot"][field] = value
    reseal(c, envelope)
    anchor_id = anchor_for(c, envelope)
    serve(direct_vm, MANIFEST_URL, body_of(envelope))

    c.verify_anchor(anchor_id)

    assert c.get_anchor_state(anchor_id) == "MISMATCH"
    assert c.get_anchor(anchor_id)["reason_code"] == "SNAPSHOT_MISMATCH"


def test_unparseable_body_is_invalid(deploy_contract, direct_vm):
    c = deploy_contract()
    envelope = load_fixture("verified.json")
    anchor_id = anchor_for(c, envelope)
    serve(direct_vm, MANIFEST_URL, "<html>not json</html>")

    c.verify_anchor(anchor_id)

    assert c.get_anchor_state(anchor_id) == "INVALID"
    assert c.get_anchor(anchor_id)["reason_code"] == "MANIFEST_UNPARSEABLE"


def test_json_that_is_not_an_object_is_invalid(deploy_contract, direct_vm):
    c = deploy_contract()
    envelope = load_fixture("verified.json")
    anchor_id = anchor_for(c, envelope)
    serve(direct_vm, MANIFEST_URL, "[1,2,3]")

    c.verify_anchor(anchor_id)

    assert c.get_anchor_state(anchor_id) == "INVALID"
    assert c.get_anchor(anchor_id)["reason_code"] == "MANIFEST_STRUCTURE_INVALID"


def test_manifest_without_implementation_references_is_invalid(deploy_contract, direct_vm):
    c = deploy_contract()
    envelope = load_fixture("no-experiment.json")
    anchor_id = anchor_for(c, envelope)
    serve(direct_vm, MANIFEST_URL, body_of(envelope))

    c.verify_anchor(anchor_id)

    assert c.get_anchor_state(anchor_id) == "INVALID"
    assert c.get_anchor(anchor_id)["reason_code"] == "MANIFEST_STRUCTURE_INVALID"


@pytest.mark.parametrize(
    "mutate,reason",
    [
        (lambda e: e.__setitem__("format", "some-other-format"), "UNSUPPORTED_FORMAT"),
        (lambda e: e["payload"].__setitem__("version", 2), "UNSUPPORTED_VERSION"),
        (lambda e: e["integrity"].__setitem__("algorithm", "md5"), "UNSUPPORTED_ALGORITHM"),
        (
            lambda e: e["integrity"].__setitem__("canonicalization", "sort-keys"),
            "UNSUPPORTED_CANONICALIZATION",
        ),
        (lambda e: e["payload"].pop("generator"), "MANIFEST_STRUCTURE_INVALID"),
        (lambda e: e["payload"].pop("supportingEvidence"), "MANIFEST_STRUCTURE_INVALID"),
        (lambda e: e["integrity"].__setitem__("digest", "not-a-digest"), "MANIFEST_STRUCTURE_INVALID"),
    ],
)
def test_unsupported_manifest_shapes_are_invalid(deploy_contract, direct_vm, mutate, reason):
    c = deploy_contract()
    envelope = load_fixture("verified.json")
    mutate(envelope)
    anchor_id = anchor_for(c, envelope)
    serve(direct_vm, MANIFEST_URL, body_of(envelope))

    c.verify_anchor(anchor_id)

    assert c.get_anchor_state(anchor_id) == "INVALID"
    assert c.get_anchor(anchor_id)["reason_code"] == reason


@pytest.mark.parametrize("status", [404, 410, 500, 503])
def test_http_error_status_is_unavailable(deploy_contract, direct_vm, status):
    c = deploy_contract()
    envelope = load_fixture("verified.json")
    anchor_id = anchor_for(c, envelope)
    serve(direct_vm, MANIFEST_URL, "gone", status=status)

    c.verify_anchor(anchor_id)

    assert c.get_anchor_state(anchor_id) == "UNAVAILABLE"
    assert c.get_anchor(anchor_id)["reason_code"] == "WEB_UNAVAILABLE"


def test_network_failure_is_unavailable(deploy_contract):
    """No mock at all: the fetch itself fails and must be caught."""
    c = deploy_contract()
    envelope = load_fixture("verified.json")
    anchor_id = anchor_for(c, envelope)

    c.verify_anchor(anchor_id)

    assert c.get_anchor_state(anchor_id) == "UNAVAILABLE"
    assert c.get_anchor(anchor_id)["reason_code"] == "WEB_UNAVAILABLE"


def test_unicode_manifest_verifies(deploy_contract, direct_vm):
    c = deploy_contract()
    envelope = load_fixture("unicode.json")
    digest = c.recompute_payload_digest(body_of(envelope["payload"]))
    anchor_id = c.anchor_manifest(MANIFEST_URL, digest, TX_LOWER, ADDR_LOWER, "accepted")
    serve(direct_vm, MANIFEST_URL, body_of(envelope))

    c.verify_anchor(anchor_id)

    assert c.get_anchor_state(anchor_id) == "VERIFIED"
    assert c.get_anchor(anchor_id)["observed_status"] == "accepted"


# --------------------------------------------------------------------------- #
# verify_anchor: settlement and retry rules
# --------------------------------------------------------------------------- #
@pytest.mark.parametrize("state", ["VERIFIED", "MISMATCH", "INVALID"])
def test_settled_anchors_cannot_be_verified_again(deploy_contract, direct_vm, state):
    c = deploy_contract()
    envelope = load_fixture("verified.json")
    anchor_id = anchor_for(c, envelope, claimed_digest="f" * 64)
    serve(direct_vm, MANIFEST_URL, body_of(envelope))
    c.verify_anchor(anchor_id)
    assert c.get_anchor_state(anchor_id) == "MISMATCH"

    with pytest.raises(Exception, match="cannot be verified again"):
        c.verify_anchor(anchor_id)


def test_unavailable_anchor_is_retryable(deploy_contract, direct_vm):
    c = deploy_contract()
    envelope = load_fixture("verified.json")
    anchor_id = anchor_for(c, envelope)

    # First attempt: nothing is serving the manifest.
    c.verify_anchor(anchor_id)
    assert c.get_anchor_state(anchor_id) == "UNAVAILABLE"

    # Second attempt: the manifest is now reachable.
    serve(direct_vm, MANIFEST_URL, body_of(envelope))
    c.verify_anchor(anchor_id)
    assert c.get_anchor_state(anchor_id) == "VERIFIED"


def test_anchored_anchor_is_retryable(deploy_contract, direct_vm):
    c = deploy_contract()
    envelope = load_fixture("verified.json")
    anchor_id = anchor_for(c, envelope)
    assert c.get_anchor_state(anchor_id) == "ANCHORED"

    serve(direct_vm, MANIFEST_URL, body_of(envelope))
    c.verify_anchor(anchor_id)
    assert c.get_anchor_state(anchor_id) == "VERIFIED"


# --------------------------------------------------------------------------- #
# Leader / validator consensus
# --------------------------------------------------------------------------- #
def test_validator_agrees_when_the_manifest_is_stable(deploy_contract, direct_vm):
    c = deploy_contract()
    envelope = load_fixture("verified.json")
    anchor_id = anchor_for(c, envelope)
    serve(direct_vm, MANIFEST_URL, body_of(envelope))

    c.verify_anchor(anchor_id)

    assert direct_vm.run_validator() is True
    assert c.get_anchor_state(anchor_id) == "VERIFIED"


def test_validator_disagrees_when_the_manifest_changes(deploy_contract, direct_vm):
    """The validator re-fetches, so a mid-flight change is detected."""
    c = deploy_contract()
    envelope = load_fixture("verified.json")
    anchor_id = anchor_for(c, envelope)
    serve(direct_vm, MANIFEST_URL, body_of(envelope))
    c.verify_anchor(anchor_id)

    direct_vm.clear_mocks()
    other = load_fixture("unicode.json")
    serve(direct_vm, MANIFEST_URL, body_of(other))

    assert direct_vm.run_validator() is False


def test_uppercase_published_digest_is_accepted(deploy_contract, direct_vm):
    """A digest written in uppercase hex still verifies.

    The observation normalizes the published digest to lowercase before
    comparison, and digests are stored lowercase, so casing in the wrapper is
    not a difference. Note this is the *digest* field only: the digest covers the
    payload bytes, so changing the casing of a hash *inside* the payload is a
    real content change and does change the digest.
    """
    c = deploy_contract()
    envelope = load_fixture("verified.json")
    anchor_id = anchor_for(c, envelope)
    envelope["integrity"]["digest"] = envelope["integrity"]["digest"].upper()
    serve(direct_vm, MANIFEST_URL, body_of(envelope))

    c.verify_anchor(anchor_id)

    assert c.get_anchor_state(anchor_id) == "VERIFIED"
    assert direct_vm.run_validator() is True


def test_validator_rejects_a_malformed_leader_result(deploy_contract, direct_vm):
    c = deploy_contract()
    envelope = load_fixture("verified.json")
    anchor_id = anchor_for(c, envelope)
    serve(direct_vm, MANIFEST_URL, body_of(envelope))
    c.verify_anchor(anchor_id)

    assert direct_vm.run_validator(leader_result="not-an-observation") is False


def test_validator_rejects_a_failed_leader(deploy_contract, direct_vm):
    c = deploy_contract()
    envelope = load_fixture("verified.json")
    anchor_id = anchor_for(c, envelope)
    serve(direct_vm, MANIFEST_URL, body_of(envelope))
    c.verify_anchor(anchor_id)

    assert direct_vm.run_validator(leader_error=Exception("leader exploded")) is False


def test_consensus_closures_are_picklable(deploy_contract, direct_vm):
    """The leader/validator closures must survive cloudpickle.

    Direct Mode replaces ``run_nondet_unsafe`` and therefore skips the SDK's
    own pickling check, so this asserts the requirement directly: a closure that
    captures the storage-backed contract instance is serializable, which is
    exactly what the SDK does before crossing the WASM boundary.
    """
    c = deploy_contract()
    instance = object.__getattribute__(c, "_instance")
    url = "https://evidence.example.test/manifests/verified.json"

    def leader_fn():
        return instance._observe_manifest(url)

    def validator_fn(leaders_res):
        return isinstance(leaders_res.calldata, dict)

    assert len(cloudpickle.dumps(leader_fn)) > 0
    assert len(cloudpickle.dumps(validator_fn)) > 0


# --------------------------------------------------------------------------- #
# Read-only views
# --------------------------------------------------------------------------- #
def test_anchor_ids_by_submitter(direct_vm, deploy_contract, direct_alice, direct_bob):
    c = deploy_contract()
    direct_vm.sender = direct_alice
    first = c.anchor_manifest(MANIFEST_URL, "a" * 64, TX_LOWER, ADDR_LOWER, STATUS)
    second = c.anchor_manifest(MANIFEST_URL, "b" * 64, TX_LOWER, ADDR_LOWER, STATUS)
    direct_vm.sender = direct_bob
    third = c.anchor_manifest(MANIFEST_URL, "c" * 64, TX_LOWER, ADDR_LOWER, STATUS)

    alice = "0x" + direct_alice.hex()
    bob = "0x" + direct_bob.hex()

    assert c.get_anchor_ids_by_submitter(alice) == [first, second]
    assert c.get_anchor_ids_by_submitter(bob) == [third]
    # `submitter` is an Address; its hex form lowercases like every other hex.
    assert c.get_anchor(1)["submitter"].as_hex.lower() == alice

    with pytest.raises(Exception, match="0x-prefixed"):
        c.get_anchor_ids_by_submitter("not-an-address")


def test_anchor_record_is_a_snapshot_not_a_live_reference(deploy_contract, direct_vm):
    """Reads must not be able to mutate stored state."""
    c = deploy_contract()
    envelope = load_fixture("verified.json")
    anchor_id = anchor_for(c, envelope)
    serve(direct_vm, MANIFEST_URL, body_of(envelope))
    c.verify_anchor(anchor_id)

    snapshot = c.get_anchor(anchor_id)
    snapshot["verification_state"] = "TAMPERED"

    assert c.get_anchor(anchor_id)["verification_state"] == "VERIFIED"
