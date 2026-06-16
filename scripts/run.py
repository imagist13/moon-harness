#!/usr/bin/env python3
"""Cross-platform launcher for Agent Harness backend and frontend."""

import subprocess
import sys
import shutil
import os
from pathlib import Path

ROOT = Path(__file__).parent.parent
BACKEND_DIR = ROOT / "backend"
FRONTEND_DIR = ROOT / "frontend"


def check_cmd(name: str) -> bool:
    return shutil.which(name) is not None


def check():
    print("Checking Python...")
    if not check_cmd("python") and not check_cmd("python3"):
        print("ERROR: Python not found! Please install Python 3.10+.")
        sys.exit(1)
    print("Python OK")

    print("Checking Node.js...")
    if not check_cmd("node"):
        print("ERROR: Node.js not found! Please install Node.js 18+.")
        sys.exit(1)
    print("Node.js OK")


def install():
    print("Installing backend dependencies...")
    subprocess.run([
        sys.executable, "-m", "pip", "install", "-r", "requirements.txt",
        "--timeout", "120",
        "-i", "https://pypi.tuna.tsinghua.edu.cn/simple"
    ], cwd=BACKEND_DIR, check=True)

    print("Installing frontend dependencies...")
    npm = "npm.cmd" if sys.platform == "win32" else "npm"
    subprocess.run([npm, "install"], cwd=FRONTEND_DIR, check=True)
    print("All dependencies installed!")


def run_backend():
    print("Starting backend on http://localhost:8000")
    return subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"],
        cwd=BACKEND_DIR
    )


def run_frontend():
    print("Starting frontend on http://localhost:5173")
    npm = "npm.cmd" if sys.platform == "win32" else "npm"
    return subprocess.Popen(
        [npm, "run", "dev"],
        cwd=FRONTEND_DIR
    )


def main():
    if len(sys.argv) > 1 and sys.argv[1] == "--check-only":
        check()
        return
    if len(sys.argv) > 1 and sys.argv[1] == "--install-only":
        check()
        install()
        return

    check()
    install()

    backend_proc = run_backend()
    frontend_proc = run_frontend()

    print("\nBoth services started!")
    print("  Backend:  http://localhost:8000")
    print("  Frontend: http://localhost:5173")
    print("  API Docs: http://localhost:8000/docs")
    print("\nPress Ctrl+C to stop.\n")

    try:
        while True:
            backend_ret = backend_proc.poll()
            frontend_ret = frontend_proc.poll()
            if backend_ret is not None:
                print(f"Backend exited with code {backend_ret}")
                frontend_proc.terminate()
                break
            if frontend_ret is not None:
                print(f"Frontend exited with code {frontend_ret}")
                backend_proc.terminate()
                break
    except KeyboardInterrupt:
        print("\nShutting down...")
        backend_proc.terminate()
        frontend_proc.terminate()
        backend_proc.wait()
        frontend_proc.wait()
        print("Done.")


if __name__ == "__main__":
    main()
