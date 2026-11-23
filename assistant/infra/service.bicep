targetScope = 'resourceGroup'

@description('Must match the initial infrastructure deployment. Lowercase letters, digits and hyphens.')
@minLength(3)
@maxLength(16)
param namePrefix string = 'recipe-reader'

param location string = resourceGroup().location

@description('Existing immutable tag of the linux/amd64 image in this deployment\'s registry, under the assistant repository.')
@minLength(1)
param imageTag string

@description('Directory associated with the subscription, not the consumer Microsoft-account tenant.')
param entraTenantId string = tenant().tenantId

@description('Owner user object ID in entraTenantId, including the directory-local object ID for a personal-account guest.')
@minLength(36)
@maxLength(36)
param entraOwnerOid string

@description('Backend API app registration Application (client) ID UUID; not its object ID or api:// URI.')
@minLength(36)
@maxLength(36)
param entraApiClientId string

@description('Source-page SPA app registration Application (client) ID UUID.')
@minLength(36)
@maxLength(36)
param entraSpaClientId string

@description('Delegated scope exposed by the API app.')
@minLength(1)
param entraScope string = 'access_as_user'

@secure()
@minLength(32)
@description('Random service token, also stored in LiveKit Secrets. Never write it into a parameter file or output.')
param assistantApiToken string

@secure()
@description('Optional old token during rotation only. Empty removes previous-token acceptance.')
param assistantApiTokenPrevious string = ''

@description('Enable only for the synthetic LiveKit header proof; disable before private sources.')
param enableAuthProbe bool = false

@description('New suffix on each rollout forces a new revision even for secret-only changes. Use a unique deployment name for each run.')
@minLength(1)
@maxLength(32)
param revisionSuffix string = 'r${uniqueString(deployment().name)}'

module infrastructure './main.bicep' = {
  name: 'assistant-infra'
  params: {
    namePrefix: namePrefix
    location: location
  }
}

var suffix = uniqueString(resourceGroup().id, namePrefix)

resource identity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' existing = {
  name: '${namePrefix}-identity-${suffix}'
}

resource app 'Microsoft.App/containerApps@2025-01-01' = {
  name: '${namePrefix}-${suffix}'
  location: location
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${identity.id}': {}
    }
  }
  properties: {
    managedEnvironmentId: infrastructure.outputs.environmentId
    workloadProfileName: 'Consumption'
    configuration: {
      activeRevisionsMode: 'Single'
      maxInactiveRevisions: 1
      ingress: {
        external: true
        allowInsecure: false
        targetPort: 8080
        transport: 'auto'
      }
      registries: [
        {
          server: infrastructure.outputs.registryLoginServer
          identity: identity.id
        }
      ]
      secrets: concat(
        [
          {
            name: 'assistant-api-token'
            value: assistantApiToken
          }
        ],
        empty(assistantApiTokenPrevious)
          ? []
          : [
              {
                name: 'assistant-api-token-previous'
                value: assistantApiTokenPrevious
              }
            ]
      )
    }
    template: {
      revisionSuffix: revisionSuffix
      containers: [
        {
          name: 'assistant'
          image: '${infrastructure.outputs.registryLoginServer}/assistant:${imageTag}'
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
          env: concat(
            [
              {
                name: 'ASSISTANT_API_TOKEN'
                secretRef: 'assistant-api-token'
              }
              {
                name: 'ENTRA_TENANT_ID'
                value: entraTenantId
              }
              {
                name: 'ENTRA_OWNER_OID'
                value: entraOwnerOid
              }
              {
                name: 'ENTRA_API_AUDIENCE'
                value: entraApiClientId
              }
              {
                name: 'ENTRA_SPA_CLIENT_ID'
                value: entraSpaClientId
              }
              {
                name: 'ENTRA_SCOPE'
                value: entraScope
              }
              {
                name: 'STORAGE_MODE'
                value: 'azure'
              }
              {
                name: 'STORAGE_ACCOUNT_URL'
                value: infrastructure.outputs.storageAccountUrl
              }
              {
                name: 'STORAGE_CONTAINER'
                value: infrastructure.outputs.storageContainer
              }
              {
                name: 'AZURE_CLIENT_ID'
                value: infrastructure.outputs.identityClientId
              }
              {
                name: 'HOST'
                value: '0.0.0.0'
              }
              {
                name: 'PORT'
                value: '8080'
              }
              {
                name: 'ENABLE_AUTH_PROBE'
                value: string(enableAuthProbe)
              }
            ],
            empty(assistantApiTokenPrevious)
              ? []
              : [
                  {
                    name: 'ASSISTANT_API_TOKEN_PREVIOUS'
                    secretRef: 'assistant-api-token-previous'
                  }
                ]
          )
          probes: [
            {
              type: 'Startup'
              httpGet: {
                path: '/healthz'
                port: 8080
                scheme: 'HTTP'
              }
              periodSeconds: 10
              timeoutSeconds: 3
              failureThreshold: 30
            }
            {
              type: 'Readiness'
              httpGet: {
                path: '/healthz'
                port: 8080
                scheme: 'HTTP'
              }
              periodSeconds: 10
              timeoutSeconds: 3
              failureThreshold: 3
            }
            {
              type: 'Liveness'
              httpGet: {
                path: '/healthz'
                port: 8080
                scheme: 'HTTP'
              }
              periodSeconds: 30
              timeoutSeconds: 3
              failureThreshold: 3
            }
          ]
        }
      ]
      scale: {
        minReplicas: 0
        maxReplicas: 1
        rules: [
          {
            name: 'http'
            http: {
              metadata: {
                concurrentRequests: '10'
              }
            }
          }
        ]
      }
    }
  }
}

output serviceUrl string = 'https://${app.properties.configuration.ingress.fqdn}'
output manageUrl string = 'https://${app.properties.configuration.ingress.fqdn}/manage/'
output spaRedirectUri string = 'https://${app.properties.configuration.ingress.fqdn}/manage/redirect'
output containerAppName string = app.name
output registryName string = infrastructure.outputs.registryName
