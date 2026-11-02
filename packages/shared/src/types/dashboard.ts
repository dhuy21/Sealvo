/** GET /dashboard: an active package with words due today */
export interface PackageToReview {
  package_id: number;
  package_name: string;
  num_words: number;
}

/** GET /dashboard */
export interface DashboardStats {
  streak: number;
  totalWords: number;
  learnedWords: number;
  newWords: number;
  islearningWords: number;
  packagesToReview: PackageToReview[];
}
