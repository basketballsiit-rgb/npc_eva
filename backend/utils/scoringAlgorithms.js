/**
 * NPC_Evaluate Scoring Algorithms Module
 */

/**
 * Standard Average Algorithm
 * @param {Array} scoresList - Array of score records from transaction_scores
 * @returns {Number} Rounded average score
 */
function calculateStandardAverage(scoresList) {
  if (!scoresList || scoresList.length === 0) return 0;
  
  const sum = scoresList.reduce((acc, curr) => acc + parseFloat(curr.total_score), 0);
  return parseFloat((sum / scoresList.length).toFixed(2));
}

/**
 * Conflict of Interest (COI) Prevention Algorithm
 * Excludes scores from judges who share the same institution code as the participant.
 * @param {Array} scoresList - Array of score records with judge & participant details
 * @param {String} participantInstitution - The institution code of the participant
 * @returns {Number} Rounded average score excluding COI matches
 */
function calculateCoiPrevention(scoresList, participantInstitution) {
  if (!scoresList || scoresList.length === 0) return 0;
  
  // Filter out judges who belong to the same institution as the participant
  const filteredScores = scoresList.filter(
    score => score.judge_institution !== participantInstitution
  );
  
  // If all judges are excluded due to COI, fallback to standard average
  if (filteredScores.length === 0) {
    return calculateStandardAverage(scoresList);
  }
  
  const sum = filteredScores.reduce((acc, curr) => acc + parseFloat(curr.total_score), 0);
  return parseFloat((sum / filteredScores.length).toFixed(2));
}

/**
 * Trimmed Mean Algorithm
 * Excludes the highest and lowest scores, then averages the rest.
 * Requires at least 3 scores to trim. Fallbacks to Standard Average otherwise.
 * @param {Array} scoresList - Array of score records
 * @returns {Number} Rounded trimmed average score
 */
function calculateTrimmedMean(scoresList) {
  if (!scoresList || scoresList.length === 0) return 0;
  
  // If less than 3 scores, cannot trim highest and lowest, so fallback to standard average
  if (scoresList.length < 3) {
    return calculateStandardAverage(scoresList);
  }
  
  // Sort scores ascending
  const sortedScores = [...scoresList].map(s => parseFloat(s.total_score)).sort((a, b) => a - b);
  
  // Remove lowest (first) and highest (last)
  const trimmed = sortedScores.slice(1, -1);
  
  const sum = trimmed.reduce((acc, curr) => acc + curr, 0);
  return parseFloat((sum / trimmed.length).toFixed(2));
}

/**
 * Main dispatcher to calculate final score based on activity's algorithm
 */
function calculateFinalScore(scoresList, algorithm, participantInstitution) {
  switch (algorithm) {
    case 'coi_prevention':
      return calculateCoiPrevention(scoresList, participantInstitution);
    case 'trimmed_mean':
      return calculateTrimmedMean(scoresList);
    case 'standard_average':
    default:
      return calculateStandardAverage(scoresList);
  }
}

module.exports = {
  calculateStandardAverage,
  calculateCoiPrevention,
  calculateTrimmedMean,
  calculateFinalScore
};
