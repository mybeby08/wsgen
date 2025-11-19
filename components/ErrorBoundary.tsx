import React from 'react'
import { View, ScrollView } from 'react-native'

import { Text } from '@/components/nativewindui/Text'
import { Button } from '@/components/nativewindui/Button'
import { ErrorLogger, getUserMessage } from '@/lib/errors'

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: (error: Error, retry: () => void) => React.ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    ErrorLogger.log(error, { componentStack: errorInfo.componentStack })
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null })
  }

  render(): React.ReactNode {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleRetry)
      }

      return (
        <View className="flex-1 items-center justify-center bg-background p-6">
          <ScrollView contentContainerClassName="items-center">
            <Text variant="largeTitle" className="mb-4 text-center font-bold text-destructive">
              Oops! Something went wrong
            </Text>
            <Text variant="body" className="mb-6 text-center" color="secondary">
              {getUserMessage(this.state.error)}
            </Text>
            {__DEV__ && (
              <View className="mb-6 w-full rounded-lg bg-muted p-4">
                <Text variant="caption1" className="font-mono text-destructive">
                  {this.state.error.message}
                </Text>
                {this.state.error.stack && (
                  <Text variant="caption2" className="mt-2 font-mono" color="tertiary">
                    {this.state.error.stack}
                  </Text>
                )}
              </View>
            )}
            <Button onPress={this.handleRetry} variant="primary" size="lg">
              <Text>Try Again</Text>
            </Button>
          </ScrollView>
        </View>
      )
    }

    return this.props.children
  }
}

/**
 * Hook-based error boundary wrapper for functional components
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ErrorBoundaryProps['fallback']
): React.FC<P> {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    )
  }
}
