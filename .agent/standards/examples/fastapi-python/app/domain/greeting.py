MAX_NAME_LENGTH = 50


def greeting(name: str) -> str:
    normalized = name.strip()
    if not normalized or len(normalized) > MAX_NAME_LENGTH:
        raise ValueError("Name must contain 1 to 50 characters.")
    return f"Hello, {normalized}!"
