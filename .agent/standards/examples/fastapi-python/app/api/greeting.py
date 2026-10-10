from fastapi import APIRouter, HTTPException, Query

from app.domain.greeting import greeting

router = APIRouter()


@router.get("/greeting")
def get_greeting(name: str = Query(min_length=1, max_length=50)) -> dict[str, str]:
    try:
        return {"message": greeting(name)}
    except ValueError as error:
        raise HTTPException(
            status_code=422, detail="Name must contain 1 to 50 characters."
        ) from error
