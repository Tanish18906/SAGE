from fastapi import FastAPI

app = FastAPI(title="Campus Safety Intelligence API")


@app.get("/health")
def health_check():
    return {"status": "ok"}
