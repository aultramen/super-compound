import pytest
from fastapi.testclient import TestClient

from app.domain.greeting import greeting
from app.main import app


def test_service_formats_a_trimmed_name() -> None:
    assert greeting("  Ada  ") == "Hello, Ada!"


@pytest.mark.parametrize("name", ["", "   ", "x" * 51])
def test_service_rejects_invalid_names(name: str) -> None:
    with pytest.raises(ValueError):
        greeting(name)


def test_route_returns_a_public_greeting() -> None:
    with TestClient(app) as client:
        response = client.get("/greeting", params={"name": "Ada"})
    assert response.status_code == 200
    assert response.json() == {"message": "Hello, Ada!"}


def test_route_returns_safe_validation_errors() -> None:
    with TestClient(app) as client:
        response = client.get("/greeting", params={"name": "   "})
    assert response.status_code == 422
    assert response.json() == {"detail": "Name must contain 1 to 50 characters."}
