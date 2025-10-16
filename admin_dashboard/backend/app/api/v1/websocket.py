"""
WebSocket API for real-time updates
실시간 업데이트를 위한 WebSocket API
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, status
from typing import Dict, List, Any, Optional
import json
import asyncio
import logging
from datetime import datetime

from app.core.database import get_db, DatabaseManager
from app.core.security import verify_admin_token
from app.core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()

class ConnectionManager:
    """WebSocket 연결 관리자"""
    
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.admin_connections: Dict[str, Dict[str, Any]] = {}
    
    async def connect(self, websocket: WebSocket, admin_id: str, admin_info: Dict[str, Any]):
        """새로운 WebSocket 연결 수락"""
        await websocket.accept()
        self.active_connections[admin_id] = websocket
        self.admin_connections[admin_id] = admin_info
        logger.info(f"관리자 {admin_info.get('email')} WebSocket 연결됨")
    
    def disconnect(self, admin_id: str):
        """WebSocket 연결 해제"""
        if admin_id in self.active_connections:
            del self.active_connections[admin_id]
        if admin_id in self.admin_connections:
            admin_info = self.admin_connections[admin_id]
            del self.admin_connections[admin_id]
            logger.info(f"관리자 {admin_info.get('email')} WebSocket 연결 해제됨")
    
    async def send_personal_message(self, message: Dict[str, Any], admin_id: str):
        """특정 관리자에게 메시지 전송"""
        if admin_id in self.active_connections:
            try:
                await self.active_connections[admin_id].send_text(json.dumps(message))
            except Exception as e:
                logger.error(f"메시지 전송 실패 (관리자 ID: {admin_id}): {e}")
                self.disconnect(admin_id)
    
    async def broadcast(self, message: Dict[str, Any], exclude_admin: Optional[str] = None):
        """모든 연결된 관리자에게 브로드캐스트"""
        disconnected_admins = []
        
        for admin_id, websocket in self.active_connections.items():
            if exclude_admin and admin_id == exclude_admin:
                continue
            
            try:
                await websocket.send_text(json.dumps(message))
            except Exception as e:
                logger.error(f"브로드캐스트 실패 (관리자 ID: {admin_id}): {e}")
                disconnected_admins.append(admin_id)
        
        # 연결이 끊어진 관리자들 정리
        for admin_id in disconnected_admins:
            self.disconnect(admin_id)
    
    def get_connected_admins(self) -> List[Dict[str, Any]]:
        """연결된 관리자 목록 반환"""
        return [
            {
                "admin_id": admin_id,
                "email": admin_info.get("email"),
                "role": admin_info.get("role"),
                "connected_at": admin_info.get("connected_at")
            }
            for admin_id, admin_info in self.admin_connections.items()
        ]

# 전역 연결 관리자 인스턴스
manager = ConnectionManager()

async def verify_websocket_token(token: str, db: DatabaseManager) -> Dict[str, Any]:
    """WebSocket용 토큰 검증"""
    try:
        admin_info = await verify_admin_token(token, db)
        return admin_info
    except Exception as e:
        logger.error(f"WebSocket 토큰 검증 실패: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="유효하지 않은 토큰입니다"
        )

@router.websocket("/connect")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str,
    db: DatabaseManager = Depends(get_db)
):
    """WebSocket 연결 엔드포인트"""
    
    try:
        # 토큰 검증
        admin_info = await verify_websocket_token(token, db)
        admin_id = admin_info["id"]
        
        # 연결 정보 추가
        admin_info["connected_at"] = datetime.now()
        
        # 연결 수락
        await manager.connect(websocket, admin_id, admin_info)
        
        # 연결 성공 메시지 전송
        await manager.send_personal_message({
            "type": "connection_established",
            "data": {
                "admin_id": admin_id,
                "email": admin_info["email"],
                "role": admin_info["role"],
                "connected_at": admin_info["connected_at"].isoformat()
            }
        }, admin_id)
        
        # 다른 관리자들에게 새 연결 알림
        await manager.broadcast({
            "type": "admin_connected",
            "data": {
                "admin_id": admin_id,
                "email": admin_info["email"],
                "role": admin_info["role"]
            }
        }, exclude_admin=admin_id)
        
        # 하트비트 및 메시지 처리 루프
        while True:
            try:
                # 하트비트 대기 (설정된 간격)
                await asyncio.wait_for(
                    websocket.receive_text(),
                    timeout=settings.WEBSOCKET_HEARTBEAT_INTERVAL
                )
                
                # 하트비트 응답
                await manager.send_personal_message({
                    "type": "heartbeat",
                    "timestamp": datetime.now().isoformat()
                }, admin_id)
                
            except asyncio.TimeoutError:
                # 하트비트 타임아웃 - 연결 유지
                await manager.send_personal_message({
                    "type": "heartbeat",
                    "timestamp": datetime.now().isoformat()
                }, admin_id)
                
            except WebSocketDisconnect:
                break
                
    except HTTPException:
        # 인증 실패
        await websocket.close(code=4001, reason="Unauthorized")
        
    except Exception as e:
        logger.error(f"WebSocket 연결 오류: {e}")
        await websocket.close(code=4000, reason="Internal Server Error")
        
    finally:
        # 연결 해제 처리
        if 'admin_id' in locals():
            manager.disconnect(admin_id)
            
            # 다른 관리자들에게 연결 해제 알림
            await manager.broadcast({
                "type": "admin_disconnected",
                "data": {
                    "admin_id": admin_id,
                    "email": admin_info.get("email"),
                    "role": admin_info.get("role")
                }
            })

async def broadcast_system_alert(alert_data: Dict[str, Any]):
    """시스템 알림 브로드캐스트"""
    message = {
        "type": "system_alert",
        "data": alert_data,
        "timestamp": datetime.now().isoformat()
    }
    await manager.broadcast(message)

async def broadcast_user_activity(activity_data: Dict[str, Any]):
    """사용자 활동 브로드캐스트"""
    message = {
        "type": "user_activity",
        "data": activity_data,
        "timestamp": datetime.now().isoformat()
    }
    await manager.broadcast(message)

async def broadcast_payment_update(payment_data: Dict[str, Any]):
    """결제 업데이트 브로드캐스트"""
    message = {
        "type": "payment_update",
        "data": payment_data,
        "timestamp": datetime.now().isoformat()
    }
    await manager.broadcast(message)

async def broadcast_system_metrics(metrics_data: Dict[str, Any]):
    """시스템 메트릭 브로드캐스트"""
    message = {
        "type": "system_metrics",
        "data": metrics_data,
        "timestamp": datetime.now().isoformat()
    }
    await manager.broadcast(message)

async def send_admin_notification(admin_id: str, notification_data: Dict[str, Any]):
    """특정 관리자에게 알림 전송"""
    message = {
        "type": "admin_notification",
        "data": notification_data,
        "timestamp": datetime.now().isoformat()
    }
    await manager.send_personal_message(message, admin_id)

# 실시간 메트릭 업데이트 태스크
async def real_time_metrics_task(db: DatabaseManager):
    """실시간 메트릭 업데이트 백그라운드 태스크"""
    
    while True:
        try:
            if manager.active_connections:
                # 시스템 메트릭 조회
                metrics_query = """
                SELECT 
                    metric_type,
                    value,
                    timestamp
                FROM real_time_metrics
                WHERE timestamp >= now() - interval '1 minute'
                ORDER BY timestamp DESC
                LIMIT 10
                """
                
                metrics_data = await db.execute_query(metrics_query)
                
                if metrics_data:
                    await broadcast_system_metrics({
                        "metrics": [
                            {
                                "type": metric["metric_type"],
                                "value": float(metric["value"]),
                                "timestamp": metric["timestamp"].isoformat()
                            }
                            for metric in metrics_data
                        ]
                    })
            
            # 30초 대기
            await asyncio.sleep(30)
            
        except Exception as e:
            logger.error(f"실시간 메트릭 업데이트 오류: {e}")
            await asyncio.sleep(60)  # 오류 시 1분 대기

# 실시간 알림 체크 태스크
async def real_time_alerts_task(db: DatabaseManager):
    """실시간 알림 체크 백그라운드 태스크"""
    
    last_check = datetime.now()
    
    while True:
        try:
            if manager.active_connections:
                # 새로운 알림 조회
                alerts_query = """
                SELECT 
                    id,
                    alert_type,
                    severity,
                    message,
                    status,
                    created_at
                FROM system_alerts
                WHERE created_at > $1
                AND status = 'active'
                ORDER BY created_at DESC
                """
                
                new_alerts = await db.execute_query(alerts_query, last_check)
                
                for alert in new_alerts:
                    await broadcast_system_alert({
                        "id": str(alert["id"]),
                        "type": alert["alert_type"],
                        "severity": alert["severity"],
                        "message": alert["message"],
                        "status": alert["status"],
                        "created_at": alert["created_at"].isoformat()
                    })
                
                last_check = datetime.now()
            
            # 10초 대기
            await asyncio.sleep(10)
            
        except Exception as e:
            logger.error(f"실시간 알림 체크 오류: {e}")
            await asyncio.sleep(30)  # 오류 시 30초 대기

@router.get("/connected-admins")
async def get_connected_admins(
    current_admin: Dict[str, Any] = Depends(verify_admin_token)
):
    """연결된 관리자 목록 조회"""
    
    try:
        connected_admins = manager.get_connected_admins()
        return {
            "connected_admins": connected_admins,
            "total_connections": len(connected_admins)
        }
        
    except Exception as e:
        logger.error(f"연결된 관리자 목록 조회 오류: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="연결된 관리자 목록을 가져오는 중 오류가 발생했습니다"
        )

@router.post("/broadcast")
async def broadcast_message(
    message_type: str,
    data: Dict[str, Any],
    current_admin: Dict[str, Any] = Depends(verify_admin_token)
):
    """관리자 메시지 브로드캐스트"""
    
    try:
        message = {
            "type": message_type,
            "data": data,
            "sender": {
                "admin_id": current_admin["id"],
                "email": current_admin["email"],
                "role": current_admin["role"]
            },
            "timestamp": datetime.now().isoformat()
        }
        
        await manager.broadcast(message, exclude_admin=current_admin["id"])
        
        return {"message": "메시지가 브로드캐스트되었습니다"}
        
    except Exception as e:
        logger.error(f"메시지 브로드캐스트 오류: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="메시지 브로드캐스트 중 오류가 발생했습니다"
        )

@router.post("/notify/{admin_id}")
async def send_notification(
    admin_id: str,
    notification_type: str,
    data: Dict[str, Any],
    current_admin: Dict[str, Any] = Depends(verify_admin_token)
):
    """특정 관리자에게 알림 전송"""
    
    try:
        notification = {
            "type": notification_type,
            "data": data,
            "sender": {
                "admin_id": current_admin["id"],
                "email": current_admin["email"],
                "role": current_admin["role"]
            },
            "timestamp": datetime.now().isoformat()
        }
        
        await send_admin_notification(admin_id, notification)
        
        return {"message": "알림이 전송되었습니다"}
        
    except Exception as e:
        logger.error(f"알림 전송 오류: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="알림 전송 중 오류가 발생했습니다"
        )

# 백그라운드 태스크 시작 함수들
async def start_background_tasks(db: DatabaseManager):
    """백그라운드 태스크 시작"""
    
    # 실시간 메트릭 업데이트 태스크
    asyncio.create_task(real_time_metrics_task(db))
    
    # 실시간 알림 체크 태스크
    asyncio.create_task(real_time_alerts_task(db))
    
    logger.info("WebSocket 백그라운드 태스크가 시작되었습니다")

# 연결 관리자 인스턴스 내보내기 (다른 모듈에서 사용)
__all__ = [
    "manager",
    "broadcast_system_alert",
    "broadcast_user_activity", 
    "broadcast_payment_update",
    "broadcast_system_metrics",
    "send_admin_notification",
    "start_background_tasks"
]