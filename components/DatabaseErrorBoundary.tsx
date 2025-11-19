import React from 'react'
import { View, Pressable } from 'react-native'
import { Text } from '@/components/nativewindui/Text'

interface DatabaseErrorBoundaryProps {
  children: React.ReactNode
}

interface DatabaseErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class DatabaseErrorBoundary extends React.Component<
  DatabaseErrorBoundaryProps,
  DatabaseErrorBoundaryState
> {
  constructor(props: DatabaseErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): DatabaseErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[Database Error Boundary] Caught error:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    // Optionally reload the app
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <View className="flex-1 items-center justify-center bg-background p-6">
          <View className="w-full max-w-md items-center gap-4">
            <Text variant="title1" className="text-center font-bold">
              ⚠️ Database Error
            </Text>
            <Text color="tertiary" className="text-center">
              We encountered a problem initializing the local database.
            </Text>
            {this.state.error && (
              <View className="w-full rounded-2xl border border-border bg-card p-4">
                <Text className="text-xs font-mono text-rose-500">
                  {this.state.error.message}
                </Text>
              </View>
            )}
            <Pressable
              onPress={this.handleReset}
              className="mt-4 rounded-2xl bg-primary px-6 py-3"
            >
              <Text className="text-base font-semibold text-white">
                Restart App
              </Text>
            </Pressable>
          </View>
        </View>
      )
    }

    return this.props.children
  }
}
