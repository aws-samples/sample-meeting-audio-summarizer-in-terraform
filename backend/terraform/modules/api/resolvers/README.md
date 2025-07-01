# AppSync Resolvers

This directory contains the resolver configurations and mapping templates for the AppSync GraphQL API.

## Resolver Files

- **Query.getStatistics**: Retrieves meeting statistics
- **Query.getSummaries**: Retrieves a list of meeting summaries
- **Query.getSummary**: Retrieves a specific meeting summary by ID
- **Query.searchSummaries**: Searches meeting summaries based on criteria
- **Mutation.deleteSummary**: Deletes a specific meeting summary
- **Mutation.deleteSummaries**: Deletes multiple meeting summaries

## File Structure

- `*.req.vtl`: Request mapping templates
- `*.res.vtl`: Response mapping templates
- `*.tf`: Terraform configuration for resolvers

Each resolver is connected to a specific Lambda function that handles the business logic.
