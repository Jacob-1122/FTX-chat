export function generateChatSummary(messages: { role: string; content: string }[]): string {
  // Get the first user message if available
  const firstUserMessage = messages.find(msg => msg.role === 'user');
  
  if (!firstUserMessage) {
    return 'New Chat Session';
  }
  
  // Extract key words from the first user message
  const content = firstUserMessage.content.toLowerCase();
  
  // Common stop words to filter out
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'is', 'was', 'are', 'were', 'been', 'be',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'can', 'what', 'when', 'where',
    'who', 'why', 'how', 'which', 'this', 'that', 'these', 'those',
    'i', 'you', 'we', 'they', 'he', 'she', 'it', 'me', 'us', 'them',
    'about', 'tell', 'explain', 'show', 'find', 'help', 'please'
  ]);
  
  // Split into words and filter
  const words = content
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));
  
  // Common topic keywords for FTX context
  const topicKeywords = {
    'ftx': 'FTX',
    'bankruptcy': 'Bankruptcy',
    'creditor': 'Creditor',
    'creditors': 'Creditors',
    'claim': 'Claim',
    'claims': 'Claims',
    'sbf': 'SBF',
    'sam': 'Sam',
    'bankman': 'Bankman',
    'fried': 'Fried',
    'alameda': 'Alameda',
    'customer': 'Customer',
    'customers': 'Customers',
    'fund': 'Fund',
    'funds': 'Funds',
    'asset': 'Asset',
    'assets': 'Assets',
    'recovery': 'Recovery',
    'distribution': 'Distribution',
    'court': 'Court',
    'case': 'Case',
    'legal': 'Legal',
    'document': 'Document',
    'documents': 'Documents',
    'filing': 'Filing',
    'filings': 'Filings',
    'fraud': 'Fraud',
    'collapse': 'Collapse',
    'exchange': 'Exchange',
    'crypto': 'Crypto',
    'cryptocurrency': 'Crypto',
    'bitcoin': 'Bitcoin',
    'token': 'Token',
    'tokens': 'Tokens',
    'trading': 'Trading',
    'lawsuit': 'Lawsuit',
    'settlement': 'Settlement'
  };
  
  // Find the most relevant words (prioritize topic keywords)
  const relevantWords: string[] = [];
  
  for (const word of words) {
    if (topicKeywords[word]) {
      relevantWords.unshift(topicKeywords[word]); // Add to beginning
    } else if (relevantWords.length < 3) {
      // Capitalize first letter
      relevantWords.push(word.charAt(0).toUpperCase() + word.slice(1));
    }
  }
  
  // Ensure we have exactly 3 words
  if (relevantWords.length === 0) {
    return 'General FTX Query';
  } else if (relevantWords.length === 1) {
    return `${relevantWords[0]} Related Query`;
  } else if (relevantWords.length === 2) {
    return `${relevantWords[0]} ${relevantWords[1]} Query`;
  } else {
    // Take the first 3 most relevant words
    return relevantWords.slice(0, 3).join(' ');
  }
}