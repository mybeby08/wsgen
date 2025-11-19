import { Account, Client, Databases } from 'appwrite'
import Constants from 'expo-constants'

const extra = Constants.expoConfig?.extra ?? {}

const client = new Client()

if (extra.appwriteEndpoint) {
  client.setEndpoint(extra.appwriteEndpoint as string)
} else {
  console.warn('Appwrite endpoint is not configured')
}

if (extra.appwriteProjectId) {
  client.setProject(extra.appwriteProjectId as string)
} else {
  console.warn('Appwrite project ID is not configured')
}

export const account = new Account(client)
export const databases = new Databases(client)

export default client

