export const getSummaries = /* GraphQL */ `
  query GetSummaries($limit: Int, $nextToken: String) {
    getSummaries(limit: $limit, nextToken: $nextToken) {
      items {
        id
        title
        date
        stakeholders
        context
        objectives
        conversationDetails
        keyPoints
        actionItems
        additionalNotes
        technicalRequirements
        timeline
        budget
        blockers
        agreements
        communicationPlan
        followUp
        questionsAnswers
        fileKey
        createdAt
        updatedAt
      }
      nextToken
    }
  }
`;

export const getSummary = /* GraphQL */ `
  query GetSummary($id: ID!) {
    getSummary(id: $id) {
      id
      title
      date
      stakeholders
      context
      objectives
      conversationDetails
      keyPoints
      actionItems
      additionalNotes
      technicalRequirements
      timeline
      budget
      blockers
      agreements
      communicationPlan
      followUp
      questionsAnswers
      fileKey
      createdAt
      updatedAt
    }
  }
`;

export const searchSummaries = /* GraphQL */ `
  query SearchSummaries($query: String!) {
    searchSummaries(query: $query) {
      id
      title
      date
      stakeholders
      context
      objectives
      conversationDetails
      keyPoints
      actionItems
      additionalNotes
      technicalRequirements
      timeline
      budget
      blockers
      agreements
      communicationPlan
      followUp
      questionsAnswers
      fileKey
      createdAt
      updatedAt
    }
  }
`;

export const getStatistics = /* GraphQL */ `
  query GetStatistics {
    getStatistics {
      totalMeetings
      totalDuration
      averageDuration
      longestMeeting
      meetingsByMonth {
        month
        count
      }
      meetingsByDay
      meetings {
        meetingId
        title
        meetingType
        language
        duration
        participantCount
        context
      }
    }
  }
`;

export const listUserProcessingStatus = /* GraphQL */ `
  query ListUserProcessingStatus {
    listUserProcessingStatus {
      fileId
      userId
      status
      stage
      progressPercentage
      errorMessage
      fileName
      createdAt
      updatedAt
    }
  }
`;
