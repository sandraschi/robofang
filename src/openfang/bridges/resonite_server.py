"""
ResoniteLink Server Prototype for OpenFang.
Implements a WebSocket server on port 4242 for real-time 3D world interaction.
"""

import asyncio
import json
import logging
import websockets
from typing import Set

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("resonite_server")


class ResoniteServer:
    def __init__(self, host: str = "0.0.0.0", port: int = 4242):
        self.host = host
        self.port = port
        self.clients: Set[websockets.WebSocketServerProtocol] = set()

    async def register(self, websocket):
        self.clients.add(websocket)
        logger.info(f"Client connected. Total clients: {len(self.clients)}")
        try:
            await self.send_system_message(
                websocket, "Connected to OpenFang ResoniteLink Prototype v0.1.0"
            )
            await self.listen(websocket)
        finally:
            self.clients.remove(websocket)
            logger.info(f"Client disconnected. Total clients: {len(self.clients)}")

    async def send_system_message(self, websocket, content: str):
        message = {"type": "update", "source": "system", "data": {"message": content}}
        await websocket.send(json.dumps(message))

    async def listen(self, websocket):
        async for message in websocket:
            try:
                data = json.loads(message)
                logger.info(f"Received: {data}")

                # Echo logic or command processing
                if data.get("type") == "command":
                    action = data.get("action")
                    logger.info(f"Processing command: {action}")

                    # Simulation: Broadcast an 'update' back for every 'spawn' or 'write'
                    response = {
                        "type": "update",
                        "action_status": "success",
                        "received_action": action,
                        "data": data.get("data"),
                    }
                    await websocket.send(json.dumps(response))

            except json.JSONDecodeError:
                logger.error("Received non-JSON message")
            except Exception as e:
                logger.error(f"Error handling message: {e}")

    async def start(self):
        logger.info(f"Starting ResoniteLink Server on ws://{self.host}:{self.port}...")
        async with websockets.serve(self.register, self.host, self.port):
            await asyncio.Future()  # run forever


if __name__ == "__main__":
    server = ResoniteServer()
    try:
        asyncio.run(server.start())
    except KeyboardInterrupt:
        logger.info("Server stopped.")
