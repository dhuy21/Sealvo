output "project_id" {
  value = railway_project.staging.id
}

output "environment_id" {
  value = local.environment_id
}

output "api_url" {
  value = "https://${railway_service_domain.api.domain}"
}

output "web_url" {
  value = "https://${railway_service_domain.web.domain}"
}

output "google_redirect_uri" {
  description = "Add this exact URI on the Google OAuth client before login works."
  value       = "https://${railway_service_domain.api.domain}/auth/google/callback"
}

output "service_ids" {
  description = "Put these in the staging GitHub environment after the first apply."
  value = {
    API       = railway_service.api.id
    Web       = railway_service.web.id
    Worker    = railway_service.worker.id
    Scheduler = railway_service.scheduler.id
  }
}
