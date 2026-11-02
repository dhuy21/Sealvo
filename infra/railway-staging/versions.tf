terraform {
  required_version = ">= 1.5.0"

  required_providers {
    railway = {
      source  = "terraform-community-providers/railway"
      version = "0.6.3"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
}

# A workspace token, not the project token used by GitHub Actions to redeploy.
# The provider reads RAILWAY_TOKEN when this is left unset.
provider "railway" {
  token = var.railway_token
}
