import subprocess
import sys

from fastapi import APIRouter
from pydantic import BaseModel

from app.config import settings
from app.dependencies import is_authenticated

router = APIRouter()


class AuthStatusResponse(BaseModel):
    authenticated: bool
    profile: str
    has_cookies: bool


class LoginResponse(BaseModel):
    status: str
    message: str
    profile: str


class InlineAuthRequest(BaseModel):
    auth_json: str


class InlineAuthResponse(BaseModel):
    status: str
    message: str


@router.get("/status", response_model=AuthStatusResponse)
async def auth_status():
    if is_authenticated():
        return AuthStatusResponse(
            authenticated=True, profile=settings.notebooklm_profile, has_cookies=True
        )
    return AuthStatusResponse(
        authenticated=False, profile=settings.notebooklm_profile, has_cookies=False
    )


@router.post("/login", response_model=LoginResponse)
async def login(browser: str = "chromium"):
    try:
        # notebooklm-py 0.3.4 does not support a --browser flag.
        # Keep the query param for backwards compatibility, but ignore it.
        subprocess.run(
            [sys.executable, "-m", "notebooklm", "login"],
            check=True,
            capture_output=True,
            text=True,
            timeout=300,
        )
        return LoginResponse(
            status="ok",
            message="Login successful. Please restart the server to use the new credentials.",
            profile=settings.notebooklm_profile,
        )
    except subprocess.TimeoutExpired:
        return LoginResponse(
            status="error",
            message=(
                "Login timed out. Complete login manually in a terminal with "
                "`notebooklm login`, then restart the API server."
            ),
            profile=settings.notebooklm_profile,
        )
    except subprocess.CalledProcessError as e:
        stderr = (e.stderr or "").strip()
        return LoginResponse(
            status="error",
            message=(
                f"Login failed: {stderr or 'unknown error'}. "
                "If browser flow is unstable, run `notebooklm login` manually in a terminal, "
                "complete login, then restart the API server."
            ),
            profile=settings.notebooklm_profile,
        )
