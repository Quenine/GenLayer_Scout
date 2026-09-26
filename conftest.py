"""Shared fixtures for the GenLayer Scout Intelligent Contract tests.

The ``genlayer-test`` pytest plugin (``gltest.direct.pytest_plugin``) is
auto-registered as a ``pytest11`` entry point, so ``direct_vm``,
``direct_deploy``, ``direct_alice``, etc. are available without import.

We pin the GenVM SDK version for the extracted ``genvm-universal`` tarball so
that contract runs do not reach out to a *latest* release whose asset layout
differs (the pinned v0.2.16 tarball is cached in ``~/.cache/gltest-direct``).
"""

import os
import sys
import tempfile

import pytest

SDK_VERSION = "v0.2.16"
CONTRACT = "contracts/scout_evidence_anchor.py"

_PLACEHOLDER_MARKER = "site-packages"


def _evict_placeholder_genlayer():
    """Drop site-packages ``genlayer`` modules from ``sys.modules``.

    The empty ``genlayer`` placeholder (0.0.1) is a separate distribution that
    can be imported into ``sys.modules`` ahead of the real SDK. Because it is a
    regular package, once present it shadows the SDK's ``genlayer`` /
    ``genlayer.gl`` regardless of ``sys.path`` ordering. Evicting it right
    before the contract module executes lets ``import genlayer.gl`` resolve to
    the extracted SDK instead.
    """
    for key in list(sys.modules):
        if key == "genlayer" or key.startswith("genlayer.") or key.startswith("genlayer_"):
            mod = sys.modules[key]
            mod_file = getattr(mod, "__file__", "") or ""
            if "gltest-direct" in mod_file:
                continue
            if _PLACEHOLDER_MARKER in mod_file:
                sys.modules.pop(key, None)


def _windows_safe_inject_message(vm):
    """Windows-safe replacement for ``loader._inject_message_to_fd0``.

    The loader's version calls ``os.unlink(path)`` on the temp file that is
    still attached to stdin (fd 0). POSIX allows unlinking an open file, but
    Windows locks it and raises ``PermissionError``. We keep the same
    behaviour but swallow the unlink failure.
    """
    _evict_placeholder_genlayer()
    from genlayer.py import calldata
    from genlayer.py.types import Address

    contract_addr = vm._contract_address
    if isinstance(contract_addr, bytes):
        contract_addr = Address(contract_addr)
    origin_addr = vm.origin
    if isinstance(origin_addr, bytes):
        origin_addr = Address(origin_addr)

    message_data = {
        "contract_address": contract_addr,
        "sender_address": Address(vm.sender),
        "origin_address": origin_addr,
        "stack": [],
        "value": vm._value,
        "datetime": vm._datetime,
        "is_init": False,
        "chain_id": vm._chain_id,
        "entry_kind": 0,
        "entry_data": b"",
        "entry_stage_data": None,
    }
    encoded = calldata.encode(message_data)

    fd, path = tempfile.mkstemp()
    try:
        os.write(fd, encoded)
        os.lseek(fd, 0, os.SEEK_SET)
        original_stdin = os.dup(0)
        vm._original_stdin_fd = original_stdin
        os.dup2(fd, 0)
    finally:
        os.close(fd)
        try:
            os.unlink(path)
        except PermissionError:
            pass


@pytest.fixture(autouse=True)
def _patch_direct_loader(monkeypatch):
    """Work around two Windows/site-packages quirks in genlayer-test Direct Mode.

    1. Evict the placeholder ``genlayer`` package immediately before the
       contract module executes so the SDK's ``genlayer.gl`` resolves.
    2. Replace the stdin-message injection with a Windows-safe variant.
    """
    from gltest.direct import loader

    original_load_module = loader._load_module

    def patched_load_module(contract_path):
        _evict_placeholder_genlayer()
        return original_load_module(contract_path)

    monkeypatch.setattr(loader, "_load_module", patched_load_module, raising=False)
    monkeypatch.setattr(
        loader, "_inject_message_to_fd0", _windows_safe_inject_message, raising=False
    )


@pytest.fixture(autouse=True)
def _strict_direct_mode(direct_vm):
    """Fail loudly on unused web/LLM mocks and on unmocked network access.

    ``direct_vm.strict_mocks`` is the public knob (warns on registered-but-unused
    mocks). ``_strict_mock_mode`` is what makes the WASI mock raise instead of
    falling through, which is what a production network failure looks like.
    """
    direct_vm.strict_mocks = True
    direct_vm._strict_mock_mode = True
    return direct_vm


@pytest.fixture
def deploy_contract(direct_deploy):
    """Deploy ScoutEvidenceAnchor pinned to the cached genvm SDK version."""

    def _deploy():
        return direct_deploy(CONTRACT, sdk_version=SDK_VERSION)

    return _deploy
