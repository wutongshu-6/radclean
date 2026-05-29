import os
import sys
from pathlib import Path

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .api import demo, outputs, pipeline, terminology

app = FastAPI(title="RadClean API", docs_url="/docs")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(demo.router)
app.include_router(outputs.router)
app.include_router(pipeline.router)
app.include_router(terminology.router)

frontend_dir = os.path.normpath(
    os.path.join(os.path.dirname(__file__), "..", "frontend")
)
if os.path.isdir(frontend_dir):
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")
