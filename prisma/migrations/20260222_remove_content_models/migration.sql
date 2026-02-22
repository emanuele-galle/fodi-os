-- Remove Content & Creative models (Asset, AssetReview, ReviewComment, SocialPost)

-- Drop dependent tables first (foreign key order)
DROP TABLE IF EXISTS "review_comments";
DROP TABLE IF EXISTS "asset_reviews";
DROP TABLE IF EXISTS "assets";
DROP TABLE IF EXISTS "social_posts";

-- Drop ReviewStatus enum
DROP TYPE IF EXISTS "ReviewStatus";
