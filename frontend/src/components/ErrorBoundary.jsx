import { Component } from 'react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary]', error, info.componentStack);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/app';
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">Une erreur inattendue s'est produite</h1>
          <p className="text-gray-500 text-sm mb-6">
            Rechargez la page ou revenez au tableau de bord. Si le problème persiste, contactez le support.
          </p>
          {import.meta.env.DEV && this.state.error && (
            <pre className="text-left text-xs bg-red-50 text-red-700 rounded-lg p-3 mb-6 overflow-auto max-h-40">
              {this.state.error.toString()}
            </pre>
          )}
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
            >
              Recharger
            </button>
            <button
              onClick={this.handleReset}
              className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm hover:bg-green-700"
            >
              Tableau de bord
            </button>
          </div>
        </div>
      </div>
    );
  }
}
