export const getUploadUrl = /* GraphQL */ `
  mutation GetUploadUrl($filename: String!, $contentType: String!, $localTimestamp: String) {
    getUploadUrl(filename: $filename, contentType: $contentType, localTimestamp: $localTimestamp) {
      uploadUrl
      fileKey
    }
  }
`;

export const deleteSummaries = /* GraphQL */ `
  mutation DeleteSummaries($ids: [ID!]!) {
    deleteSummaries(ids: $ids) {
      success
      message
      deletedIds
      failedIds
    }
  }
`;

export const deleteSummary = /* GraphQL */ `
  mutation DeleteSummary($id: ID!) {
    deleteSummary(id: $id) {
      success
      message
      deletedId
    }
  }
`;
