from abc import ABC, abstractmethod


class UseCase[TIn, TOut](ABC):
    """Single input, returns a result."""

    @abstractmethod
    async def execute(self, request: TIn) -> TOut: ...


class NullaryUseCase[TOut](ABC):
    """No input, returns a result."""

    @abstractmethod
    async def execute(self) -> TOut: ...


class UnitUseCase[TIn](ABC):
    """Single input, no return."""

    @abstractmethod
    async def execute(self, request: TIn) -> None: ...
