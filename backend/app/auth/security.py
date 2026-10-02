import hashlib
import hmac
import re
import secrets

from app.infrastructure.exceptions import ValidationError

_PBKDF2_ITERATIONS = 390_000

# Min 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special char
_PASSWORD_PATTERN = re.compile(r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s]).{8,}$")


def validate_password_strength(password: str) -> None:
    if not _PASSWORD_PATTERN.match(password):
        raise ValidationError("auth.weakPassword")


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), _PBKDF2_ITERATIONS)
    return f"{salt}:{digest.hex()}"


def verify_password(password: str, password_hash: str) -> bool:
    salt, _, digest_hex = password_hash.partition(":")
    expected = hashlib.pbkdf2_hmac(
        "sha256", password.encode(), bytes.fromhex(salt), _PBKDF2_ITERATIONS
    )
    return hmac.compare_digest(expected.hex(), digest_hex)


def generate_session_token() -> str:
    return secrets.token_urlsafe(32)
