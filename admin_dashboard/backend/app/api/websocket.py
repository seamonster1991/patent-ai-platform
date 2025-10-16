"""
WebSocket API for real-time updates
"""
import json
import asyncio
from typing import Dict, List, Set
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_active_admin_ws
from app.models.admin import AdminUser
from app.services.monitoring_service import MonitoringService
from app.services.user_service import UserService
from app.services.payment_service import PaymentService

router = APIRouter()


class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.admin_connections: Set[str] = set()

    async def connect(self, websocket: WebSocket, admin_id: str):
        await websocket.accept()
        self.active_connections[admin_id] = websocket
        self.admin_connections.add(admin_id)

    def disconnect(self, admin_id: str):
        if admin_id in self.active_connections:
            del self.active_connections[admin_id]
        if admin_id in self.admin_connections:
            self.admin_connections.remove(admin_id)

    async def send_personal_message(self, message: str, admin_id: str):
        if admin_id in self.active_connections:
            try:
                await self.active_connections[admin_id].send_text(message)
            except:
                self.disconnect(admin_id)

    async def broadcast(self, message: str):
        disconnected = []
        for admin_id, connection in self.active_connections.items():
            try:
                await connection.send_text(message)
            except:
                disconnected.append(admin_id)
        
        # Clean up disconnected connections
        for admin_id in disconnected:
            self.disconnect(admin_id)


manager = ConnectionManager()


@router.websocket("/ws/{admin_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    admin_id: str,
    db: Session = Depends(get_db)
):
    """WebSocket endpoint for real-time admin dashboard updates"""
    try:
        # Verify admin authentication
        admin = await get_current_active_admin_ws(admin_id, db)
        if not admin:
            await websocket.close(code=4001, reason="Unauthorized")
            return

        await manager.connect(websocket, admin_id)
        
        # Send initial data
        await send_initial_data(websocket, admin_id, db)
        
        # Start background tasks for real-time updates
        update_task = asyncio.create_task(
            send_periodic_updates(admin_id, db)
        )
        
        try:
            while True:
                # Listen for client messages
                data = await websocket.receive_text()
                message_data = json.loads(data)
                
                # Handle different message types
                await handle_client_message(message_data, admin_id, db)
                
        except WebSocketDisconnect:
            pass
        finally:
            update_task.cancel()
            manager.disconnect(admin_id)
            
    except Exception as e:
        await websocket.close(code=4000, reason=str(e))


async def send_initial_data(websocket: WebSocket, admin_id: str, db: Session):
    """Send initial dashboard data to newly connected admin"""
    try:
        monitoring_service = MonitoringService(db)
        user_service = UserService(db)
        payment_service = PaymentService(db)
        
        # Get initial metrics
        system_health = monitoring_service.get_system_health()
        user_stats = user_service.get_user_statistics()
        payment_stats = payment_service.get_payment_statistics()
        
        initial_data = {
            "type": "initial_data",
            "data": {
                "system_health": system_health,
                "user_stats": user_stats,
                "payment_stats": payment_stats,
                "timestamp": asyncio.get_event_loop().time()
            }
        }
        
        await manager.send_personal_message(
            json.dumps(initial_data), 
            admin_id
        )
        
    except Exception as e:
        print(f"Error sending initial data: {e}")


async def send_periodic_updates(admin_id: str, db: Session):
    """Send periodic updates to connected admin"""
    try:
        while True:
            await asyncio.sleep(5)  # Update every 5 seconds
            
            monitoring_service = MonitoringService(db)
            
            # Get real-time metrics
            realtime_metrics = monitoring_service.get_realtime_metrics()
            
            update_data = {
                "type": "realtime_update",
                "data": {
                    "metrics": realtime_metrics,
                    "timestamp": asyncio.get_event_loop().time()
                }
            }
            
            await manager.send_personal_message(
                json.dumps(update_data), 
                admin_id
            )
            
    except asyncio.CancelledError:
        pass
    except Exception as e:
        print(f"Error in periodic updates: {e}")


async def handle_client_message(message_data: dict, admin_id: str, db: Session):
    """Handle messages from client"""
    try:
        message_type = message_data.get("type")
        
        if message_type == "subscribe_to_alerts":
            # Handle alert subscription
            await handle_alert_subscription(message_data, admin_id, db)
            
        elif message_type == "request_data":
            # Handle specific data requests
            await handle_data_request(message_data, admin_id, db)
            
        elif message_type == "ping":
            # Handle ping/pong for connection health
            pong_data = {
                "type": "pong",
                "timestamp": asyncio.get_event_loop().time()
            }
            await manager.send_personal_message(
                json.dumps(pong_data), 
                admin_id
            )
            
    except Exception as e:
        print(f"Error handling client message: {e}")


async def handle_alert_subscription(message_data: dict, admin_id: str, db: Session):
    """Handle alert subscription requests"""
    alert_types = message_data.get("alert_types", [])
    
    # Store subscription preferences (you might want to persist this)
    response = {
        "type": "subscription_confirmed",
        "data": {
            "alert_types": alert_types,
            "admin_id": admin_id
        }
    }
    
    await manager.send_personal_message(
        json.dumps(response), 
        admin_id
    )


async def handle_data_request(message_data: dict, admin_id: str, db: Session):
    """Handle specific data requests from client"""
    data_type = message_data.get("data_type")
    
    try:
        if data_type == "user_activity":
            user_service = UserService(db)
            activity_data = user_service.get_user_activity_summary()
            
        elif data_type == "payment_trends":
            payment_service = PaymentService(db)
            trends_data = payment_service.get_revenue_analytics()
            
        elif data_type == "system_performance":
            monitoring_service = MonitoringService(db)
            performance_data = monitoring_service.get_performance_metrics(24)
            
        else:
            activity_data = {"error": "Unknown data type"}
        
        response = {
            "type": "data_response",
            "data_type": data_type,
            "data": activity_data if data_type == "user_activity" else 
                   trends_data if data_type == "payment_trends" else 
                   performance_data if data_type == "system_performance" else 
                   {"error": "Unknown data type"}
        }
        
        await manager.send_personal_message(
            json.dumps(response), 
            admin_id
        )
        
    except Exception as e:
        error_response = {
            "type": "error",
            "message": f"Error fetching {data_type}: {str(e)}"
        }
        await manager.send_personal_message(
            json.dumps(error_response), 
            admin_id
        )


# Utility functions for broadcasting alerts
async def broadcast_system_alert(alert_type: str, message: str, severity: str = "info"):
    """Broadcast system alert to all connected admins"""
    alert_data = {
        "type": "system_alert",
        "data": {
            "alert_type": alert_type,
            "message": message,
            "severity": severity,
            "timestamp": asyncio.get_event_loop().time()
        }
    }
    
    await manager.broadcast(json.dumps(alert_data))


async def broadcast_user_event(event_type: str, user_data: dict):
    """Broadcast user-related events to all connected admins"""
    event_data = {
        "type": "user_event",
        "data": {
            "event_type": event_type,
            "user_data": user_data,
            "timestamp": asyncio.get_event_loop().time()
        }
    }
    
    await manager.broadcast(json.dumps(event_data))


async def broadcast_payment_event(event_type: str, payment_data: dict):
    """Broadcast payment-related events to all connected admins"""
    event_data = {
        "type": "payment_event",
        "data": {
            "event_type": event_type,
            "payment_data": payment_data,
            "timestamp": asyncio.get_event_loop().time()
        }
    }
    
    await manager.broadcast(json.dumps(event_data))