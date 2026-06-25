#!/usr/bin/env python3
"""Invite legacy Vonos Cafe staff via Vonos API (dev returns invite URLs)."""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request

API = os.environ.get("VONOS_API_URL", "http://localhost:3001")
STAFF = [
    {"email": "admin@vonosautomarket.com", "name": "Vonos Autos", "role": "admin", "inviter": "vag"},
    {"email": "victoria@vonosautos.com", "name": "Victoria Ejima", "role": "staff", "inviter": "vc"},
]

INVITERS = {
    "vc": (os.environ.get("VC_INVITER_EMAIL", "admin@vc.vonos"), os.environ.get("VC_INVITER_PASSWORD", "password")),
    "vag": (os.environ.get("VAG_INVITER_EMAIL", "admin@vag.vonos"), os.environ.get("VAG_INVITER_PASSWORD", "demo123")),
}


def request(method: str, path: str, *, token: str | None = None, body: dict | None = None):
    url = f"{API}{path}"
    data = json.dumps(body).encode() if body is not None else None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=30) as resp:
        raw = resp.read().decode()
        return resp.status, json.loads(raw) if raw else {}


def login(email: str, password: str) -> str | None:
    try:
        _, result = request(
            "POST",
            "/auth/login",
            body={"email": email, "password": password},
        )
    except urllib.error.HTTPError as exc:
        print(f"Login failed for {email}: {exc.read().decode()}", file=sys.stderr)
        return None
    return result.get("accessToken") or result.get("token")


def main() -> int:
    print(f"Inviting VC staff via {API}")
    tokens: dict[str, str | None] = {}

    for person in STAFF:
        inviter_key = person.get("inviter", "vc")
        if inviter_key not in tokens:
            email, password = INVITERS[inviter_key]
            tokens[inviter_key] = login(email, password)
        token = tokens[inviter_key]
        if not token:
            continue

        payload = {k: v for k, v in person.items() if k != "inviter"}
        if inviter_key == "vag":
            payload["tenantId"] = "tenant_vc_001"
        try:
            status, result = request(
                "POST",
                "/users/invite",
                token=token,
                body=payload,
            )
            invite_url = result.get("devInviteUrl") or "(check email — production)"
            print(f"  {person['email']} ({person['role']}): HTTP {status} → {invite_url}")
        except urllib.error.HTTPError as exc:
            body = exc.read().decode()
            print(f"  {person['email']}: HTTP {exc.code} {body}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
