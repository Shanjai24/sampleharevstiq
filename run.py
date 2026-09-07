#!/usr/bin/env python3
"""
HarvestIQ (AgroPredict) All-in-One Service Runner
Runs ML Engine (Flask :5001), Backend API (Express :5000), and Frontend (Vite :5173) concurrently.
Usage:
    python run.py
"""

import os
import sys
import subprocess
import threading
import signal
import time

ROOT_DIR = os.path.abspath(os.path.dirname(__file__))

# ANSI Color Codes for Terminal Output
GREEN = "\033[92m"
BLUE = "\033[94m"
MAGENTA = "\033[95m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
BOLD = "\033[1m"
RESET = "\033[0m"

ml_venv_py = os.path.join(ROOT_DIR, "ml", "venv", "Scripts", "python.exe") if sys.platform == "win32" else os.path.join(ROOT_DIR, "ml", "venv", "bin", "python")
ml_python = ml_venv_py if os.path.exists(ml_venv_py) else sys.executable

SERVICES = [
    {
        "name": "ML-ENGINE",
        "color": GREEN,
        "cwd": os.path.join(ROOT_DIR, "ml"),
        "cmd": [ml_python, "-u", "app.py"]
    },
    {
        "name": "BACKEND",
        "color": BLUE,
        "cwd": os.path.join(ROOT_DIR, "backend"),
        "cmd": ["npm", "start"] if sys.platform != "win32" else ["cmd.exe", "/c", "npm start"]
    },
    {
        "name": "FRONTEND",
        "color": MAGENTA,
        "cwd": os.path.join(ROOT_DIR, "frontend"),
        "cmd": ["npm", "run", "dev"] if sys.platform != "win32" else ["cmd.exe", "/c", "npm run dev"]
    }
]

processes = []
shutting_down = False

def stream_output(pipe, service_name, color):
    """Read lines from process stdout/stderr and print with colorized service tag."""
    try:
        for line in iter(pipe.readline, ''):
            if not line:
                break
            line_str = line.rstrip()
            if line_str:
                print(f"{color}[{service_name}]{RESET} {line_str}", flush=True)
    except Exception:
        pass

def start_service(service):
    """Start an individual service process."""
    try:
        proc = subprocess.Popen(
            service["cmd"],
            cwd=service["cwd"],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            encoding="utf-8",
            errors="replace"
        )
        processes.append((service["name"], proc))
        t = threading.Thread(
            target=stream_output,
            args=(proc.stdout, service["name"], service["color"]),
            daemon=True
        )
        t.start()
        return proc
    except Exception as e:
        print(f"{YELLOW}[ERROR]{RESET} Failed to start {service['name']}: {e}", flush=True)
        return None

def shutdown(signum=None, frame=None):
    """Gracefully terminate all running subprocesses."""
    global shutting_down
    if shutting_down:
        return
    shutting_down = True

    print(f"\n{YELLOW}Stopping all HarvestIQ services...{RESET}", flush=True)
    for name, proc in processes:
        try:
            if sys.platform == "win32":
                subprocess.call(["taskkill", "/F", "/T", "/PID", str(proc.pid)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            else:
                proc.terminate()
        except Exception:
            pass
    print(f"{GREEN}All services stopped successfully.{RESET}", flush=True)
    sys.exit(0)

def main():
    # Enable ANSI escape sequences on Windows console and ensure UTF-8 output
    if sys.platform == "win32":
        os.system("")
        if hasattr(sys.stdout, 'reconfigure'):
            sys.stdout.reconfigure(encoding='utf-8', errors='replace')

    print(f"{BOLD}{CYAN}======================================================{RESET}")
    print(f"{BOLD}{CYAN}   🌱 AgroPredict / HarvestIQ - All-in-One Runner     {RESET}")
    print(f"{BOLD}{CYAN}======================================================{RESET}")
    print(f" {GREEN}• ML Engine:{RESET}   http://localhost:5001")
    print(f" {BLUE}• Backend API:{RESET} http://localhost:5000")
    print(f" {MAGENTA}• Frontend:{RESET}    http://localhost:5173")
    print(f"{CYAN}------------------------------------------------------{RESET}")
    print(f" Press {YELLOW}Ctrl+C{RESET} to stop all services.\n")

    # Register termination signals
    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)

    # Start all 3 services
    for service in SERVICES:
        print(f"{service['color']}Starting {service['name']}...{RESET}")
        start_service(service)
        time.sleep(0.5)

    # Keep main thread alive and monitor processes
    reported_exited = set()
    try:
        while True:
            time.sleep(1)
            for name, proc in processes:
                if proc.poll() is not None and not shutting_down and name not in reported_exited:
                    reported_exited.add(name)
                    print(f"{YELLOW}[WARN]{RESET} {name} exited with code {proc.returncode}", flush=True)
    except KeyboardInterrupt:
        shutdown()

if __name__ == "__main__":
    main()
