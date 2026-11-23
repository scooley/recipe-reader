using './service.bicep'

// Copy to service.local.bicepparam and replace only non-secret placeholders.
// Keep namePrefix/location equal to the initial main.bicep deployment if overridden.
param imageTag = 'v1'
param entraOwnerOid = '00000000-0000-0000-0000-000000000001'
param entraApiClientId = '00000000-0000-0000-0000-000000000002'
param entraSpaClientId = '00000000-0000-0000-0000-000000000003'

// Set this temporary environment value from the existing Swamp default vault; see README.
// Never replace it with a literal secret or commit generated parameter JSON.
param assistantApiToken = readEnvironmentVariable('ASSISTANT_API_TOKEN')

// Enable only for the synthetic header proof, then change back to false and redeploy.
param enableAuthProbe = false
