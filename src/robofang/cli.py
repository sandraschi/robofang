"""
RoboFang Unified CLI
====================
A rich, Typer-based command-line interface for managing the RoboFang fleet.
"""

import os
import subprocess
import sys

import httpx
import typer
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

app = typer.Typer(help="RoboFang Unified Operations CLI", no_args_is_help=True)
console = Console()

_REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


@app.command()
def bridge():
    """Start the main RoboFang bridge and MCP gateway."""
    console.print(Panel.fit("[bold green]Starting RoboFang Bridge...[/bold green]"))
    try:
        subprocess.run([sys.executable, "-m", "robofang.main"], cwd=_REPO_ROOT)
    except KeyboardInterrupt:
        console.print("[yellow]Bridge interrupted by user.[/yellow]")


@app.command()
def supervisor():
    """Start the RoboFang supervisor process."""
    console.print(Panel.fit("[bold blue]Starting RoboFang Supervisor...[/bold blue]"))
    try:
        subprocess.run([sys.executable, "-m", "robofang.supervisor"], cwd=_REPO_ROOT)
    except KeyboardInterrupt:
        console.print("[yellow]Supervisor interrupted by user.[/yellow]")


@app.command()
def status():
    """Query the local bridge and supervisor endpoints for health status."""
    console.print("[bold cyan]Checking local platform health...[/bold cyan]\n")

    table = Table(title="RoboFang Core Services")
    table.add_column("Service", style="cyan", no_wrap=True)
    table.add_column("Port", style="magenta")
    table.add_column("Status", style="green")

    # Check Supervisor (default config uses 10866 or dynamic)
    # We will try the known default local port: 10866
    try:
        r = httpx.get("http://localhost:10866/supervisor/health", timeout=2.0)
        sup_status = "[bold green]ONLINE[/bold green]" if r.status_code == 200 else f"[red]HTTP {r.status_code}[/red]"
    except httpx.ConnectError:
        sup_status = "[bold red]OFFLINE[/bold red]"

    table.add_row("Supervisor", "10866", sup_status)

    # Check Bridge
    try:
        r = httpx.get("http://localhost:10866/supervisor/status", timeout=2.0)
        if r.status_code == 200:
            data = r.json()
            bridge_state = data.get("state", "unknown")
            if bridge_state == "running":
                br_status = "[bold green]RUNNING[/bold green]"
            else:
                br_status = f"[bold yellow]{bridge_state.upper()}[/bold yellow]"
        else:
            br_status = f"[red]HTTP {r.status_code}[/red]"
    except httpx.ConnectError:
        br_status = "[bold red]UNREACHABLE[/bold red]"

    table.add_row("Bridge", "Managed", br_status)

    console.print(table)
    print()


def main():
    app()


if __name__ == "__main__":
    main()
