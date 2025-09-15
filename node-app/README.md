def add(a: int, b: int) -> int:
    """
    Return the sum of two integers.

    Args:
        a (int): first addend
        b (int): second addend

    Returns:
        int: the sum of a and b

    Examples:
        >>> add(2, 3)
        5
    """
    return a + b


def divide(a: float, b: float) -> float:
    """
    Divide a by b.

    Notes:
        This function does not handle ZeroDivisionError internally.

    Raises:
        ZeroDivisionError: if b == 0
    """
    return a / b


def slugify(text: str) -> str:
    """Convert text to a simple slug. Lowercase and replace spaces with hyphens."""
    return "-".join(text.strip().lower().split())