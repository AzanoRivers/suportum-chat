from fastapi import APIRouter

from app.api.v1 import setup, auth, messages, tickets, orders, users, upload, projects

router = APIRouter()

router.include_router(setup.router,    prefix="/setup",    tags=["setup"])
router.include_router(auth.router,     prefix="/auth",     tags=["auth"])
router.include_router(messages.router, prefix="/messages", tags=["messages"])
router.include_router(tickets.router,  prefix="/tickets",  tags=["tickets"])
router.include_router(orders.router,   prefix="/orders",   tags=["orders"])
router.include_router(users.router,    prefix="/users",    tags=["users"])
router.include_router(upload.router,   prefix="/upload",   tags=["upload"])
router.include_router(projects.router, prefix="/projects", tags=["projects"])
