from src.backend.core.config.settings import settings
print("sso.login_mode           =", repr(settings.sso.login_mode))
print("sso.effective_login_mode =", repr(settings.sso.effective_login_mode))
print("sso.mock_enabled         =", repr(settings.sso.mock_enabled))
print("edition.edition          =", repr(settings.edition.edition))
print("auth.mode                =", repr(settings.auth.mode))
print("auth.mock_user_id        =", repr(settings.auth.mock_user_id))
print("---")
import os
for k in ("SSO_LOGIN_MODE","JX_EDITION","VITE_EDITION","AUTH_MOCK_USER_ID","SSO_MOCK_ENABLED"):
    print(f"os.environ[{k:24s}] = {os.environ.get(k)!r}")
