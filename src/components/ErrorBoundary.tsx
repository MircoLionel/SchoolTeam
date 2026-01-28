import { Component, ErrorInfo, ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    message: "Ocurrió un error inesperado."
  };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error.message || "Ocurrió un error inesperado." };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="login">
          <div className="login-card">
            <h1>Algo salió mal</h1>
            <p>{this.state.message}</p>
            <p className="login-hint">
              Revisá la consola del navegador o recargá la página si el problema persiste.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
