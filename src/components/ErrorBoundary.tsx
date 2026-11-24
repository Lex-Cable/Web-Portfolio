import React from 'react';

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message || 'An unexpected error occurred.' };
  }

  render() {
    if (this.state.hasError) {
      let friendly = this.state.message;
      try {
        const parsed = JSON.parse(this.state.message) as { error?: string; path?: string };
        if (parsed.error) {
          friendly = `Database access notice (${parsed.path || 'Firestore'}): ${parsed.error}`;
        }
      } catch {
        // Use raw message
      }
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#f4f0e9] dark:bg-[#111110] p-6">
          <div className="max-w-lg w-full bg-[#fffdf9] dark:bg-[#191816] border border-[#ddd4c9] dark:border-[#2c2925] rounded-2xl p-8">
            <h1 className="text-xl font-bold text-[#161616] dark:text-[#fffdf9] mb-2">
              Unable to render this view
            </h1>
            <p className="text-sm text-[#68635d] dark:text-[#b9aea2] mb-6 break-words">
              {friendly}
            </p>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, message: '' });
                window.location.href = '/';
              }}
              className="px-5 py-2.5 text-sm font-semibold rounded-full bg-[#161616] dark:bg-[#b98b6e] text-[#fffdf9] dark:text-[#161616] hover:bg-[#2d2b28] dark:hover:bg-[#caa288] transition-colors"
            >
              Return Home
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
