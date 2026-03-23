export type SessionUser = {
  email: string;
  name: string;
};

export type ProblemType =
  | "POLLUTION"
  | "ALGAE_BLOOM"
  | "WILDLIFE_DISTRESS"
  | "ILLEGAL_DUMPING"
  | "INFRASTRUCTURE_DAMAGE"
  | "OTHER";

export type EnvironmentalReport = {
  id: number;
  description: string;
  problemType: ProblemType;
  blobName: string;
  imageUrl: string;
  createdAt: string;
  satelliteImageUrl?: string;
  satelliteTakenAt?: string;
};
