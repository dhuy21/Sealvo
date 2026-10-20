variable "railway_token" {
  description = "Railway workspace token. Leave empty to use RAILWAY_TOKEN."
  type        = string
  sensitive   = true
  default     = null
}

variable "workspace_id" {
  description = "Railway workspace that owns the new staging project."
  type        = string
  default     = "d27f5ac8-f411-456d-af85-ee86d3aa6ab1"
}

variable "region" {
  description = "Railway region. europe-west4 is Amsterdam."
  type        = string
  default     = "europe-west4"
}

variable "api_image" {
  description = "API image. GitHub Actions moves the :staging tag after a build."
  type        = string
  default     = "ghcr.io/dhuy21/sealvo/api:staging"
}

variable "web_image" {
  description = "Web image. GitHub Actions moves the :staging tag after a build."
  type        = string
  default     = "ghcr.io/dhuy21/sealvo/web:staging"
}

variable "ghcr_username" {
  description = "GitHub user that can pull the private GHCR packages."
  type        = string
  default     = "dhuy21"
}

variable "ghcr_token" {
  description = "GitHub token with read:packages."
  type        = string
  sensitive   = true
}

variable "aws_region" {
  type = string
}

variable "aws_access_key_id" {
  type      = string
  sensitive = true
}

variable "aws_secret_access_key" {
  type      = string
  sensitive = true
}

variable "aws_ses_from" {
  type = string
}

variable "google_client_id" {
  type = string
}

variable "google_client_secret" {
  type      = string
  sensitive = true
}

variable "feedback_recipient_email" {
  type = string
}

variable "staging_email_intercept" {
  description = "Every staging email is redirected here. Use the inbox you actually read."
  type        = string
}

variable "gemini_api_key" {
  type      = string
  sensitive = true
  default   = ""
}

variable "google_tts_project_id" {
  type    = string
  default = ""
}

variable "google_tts_client_email" {
  type    = string
  default = ""
}

variable "google_tts_private_key" {
  type      = string
  sensitive = true
  default   = ""
}
