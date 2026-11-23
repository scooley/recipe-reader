targetScope = 'resourceGroup'

@description('Use the same prefix and resource group for infrastructure and service deployments. Lowercase letters, digits and hyphens; start and end with a letter or digit.')
@minLength(3)
@maxLength(16)
param namePrefix string = 'recipe-reader'

@description('Azure public-cloud region supporting Container Apps Consumption. Keep unchanged on redeployment.')
param location string = resourceGroup().location

var suffix = uniqueString(resourceGroup().id, namePrefix)
var blobContributorRoleId = subscriptionResourceId(
  'Microsoft.Authorization/roleDefinitions',
  'ba92f5b4-2d11-453d-a403-e96b0029c9fe'
)
var acrPullRoleId = subscriptionResourceId(
  'Microsoft.Authorization/roleDefinitions',
  '7f951dda-4ed3-4680-a7ca-43fe172d538d'
)

resource registry 'Microsoft.ContainerRegistry/registries@2025-04-01' = {
  name: 'rr${suffix}'
  location: location
  sku: {
    name: 'Basic'
  }
  properties: {
    adminUserEnabled: false
    anonymousPullEnabled: false
    publicNetworkAccess: 'Enabled'
    policies: {
      azureADAuthenticationAsArmPolicy: {
        status: 'enabled'
      }
    }
  }
}

resource identity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: '${namePrefix}-identity-${suffix}'
  location: location
}

resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: 'rr${suffix}'
  location: location
  kind: 'StorageV2'
  sku: {
    name: 'Standard_LRS'
  }
  properties: {
    accessTier: 'Hot'
    allowBlobPublicAccess: false
    allowSharedKeyAccess: false
    defaultToOAuthAuthentication: true
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
    publicNetworkAccess: 'Enabled'
  }
}

resource blobs 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01' = {
  parent: storage
  name: 'default'
  properties: {
    isVersioningEnabled: false
    deleteRetentionPolicy: {
      enabled: false
    }
    containerDeleteRetentionPolicy: {
      enabled: false
    }
    changeFeed: {
      enabled: false
    }
    restorePolicy: {
      enabled: false
    }
  }
}

resource container 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  parent: blobs
  name: 'assistant'
  properties: {
    publicAccess: 'None'
  }
}

resource blobAccess 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(container.id, identity.id, blobContributorRoleId)
  scope: container
  properties: {
    principalId: identity.properties.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: blobContributorRoleId
  }
}

resource registryAccess 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(registry.id, identity.id, acrPullRoleId)
  scope: registry
  properties: {
    principalId: identity.properties.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: acrPullRoleId
  }
}

resource environment 'Microsoft.App/managedEnvironments@2025-01-01' = {
  name: '${namePrefix}-env-${suffix}'
  location: location
  properties: {
    appLogsConfiguration: {
      // ARM uses null, not the CLI value 'none', to disable persisted logs.
      destination: null
    }
    workloadProfiles: [
      {
        name: 'Consumption'
        workloadProfileType: 'Consumption'
      }
    ]
  }
}

output containerAppName string = '${namePrefix}-${suffix}'
output environmentId string = environment.id
output registryName string = registry.name
output registryLoginServer string = registry.properties.loginServer
output storageAccountUrl string = storage.properties.primaryEndpoints.blob
output storageContainer string = container.name
output identityId string = identity.id
output identityClientId string = identity.properties.clientId
