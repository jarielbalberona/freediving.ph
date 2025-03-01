locals {
  tags = {
    environment = "${var.environment}"
    project     = "${var.project}"
    source      = "terraform"
  }
}
