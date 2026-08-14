import { ErrorBoundary } from './Shared';
import App from '../App';

export function Root() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
