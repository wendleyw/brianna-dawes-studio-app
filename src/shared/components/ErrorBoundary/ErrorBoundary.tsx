import { Component, type ReactNode, type ErrorInfo } from 'react';
import { createLogger } from '@shared/lib/logger';
import styles from './ErrorBoundary.module.css';

const logger = createLogger('ErrorBoundary');

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary Component
 *
 * Catches JavaScript errors anywhere in the child component tree,
 * logs them, and displays a fallback UI instead of crashing.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });

    // Log the error
    logger.error('Uncaught error in component tree', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });

    // Call optional error handler
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className={styles.container}>
          <div className={styles.card}>
            <div className={styles.iconWrapper}>
              <span className={styles.icon}>!</span>
            </div>

            <h1 className={styles.title}>Something went wrong</h1>

            <p className={styles.message}>
              We're sorry, but something unexpected happened. Please try again or reload the page.
            </p>

            {this.state.error && (
              <div className={styles.errorDetails}>
                <p className={styles.errorName}>{this.state.error.name}</p>
                <p className={styles.errorMessage}>{this.state.error.message}</p>
              </div>
            )}

            <div className={styles.actions}>
              <button type="button" onClick={this.handleRetry} className={styles.buttonPrimary}>
                Try Again
              </button>
              <button type="button" onClick={this.handleReload} className={styles.buttonSecondary}>
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
