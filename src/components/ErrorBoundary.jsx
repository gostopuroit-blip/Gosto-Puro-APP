import React from "react";

/**
 * Captura erros de render em widgets filhos e mostra um cartão de erro
 * em vez de derrubar a página inteira (tela branca).
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error("ErrorBoundary caught:", error, info?.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
          <p className="text-3xl mb-2">⚠️</p>
          <p className="text-sm font-bold text-red-700 mb-1">
            {this.props.label || "Questa sezione"} ha riscontrato un errore
          </p>
          <p className="text-xs text-red-500 mb-4 break-words">
            {this.state.error?.message || String(this.state.error)}
          </p>
          <button
            onClick={this.reset}
            className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700"
          >
            Riprova
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
