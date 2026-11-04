# DNS only. The domain stays registered at Dynadot.
# These records match the live Dynadot zone. Applying this does not move
# the domain until Dynadot's name servers are changed to the outputs below.

resource "aws_route53_zone" "sealvo" {
  name    = "sealvo.it.com"
  comment = "DNS for sealvo.it.com. Registration stays at Dynadot."
}

resource "aws_route53_record" "apex_txt" {
  zone_id = aws_route53_zone.sealvo.zone_id
  name    = "sealvo.it.com"
  type    = "TXT"
  ttl     = 600
  records = ["google-site-verification=OZEsFmuTBWpEDLjpGl9KSACGVYFIGOQ9Kvydxn-fMiU"]
}

# The website still points at the current Railway host.
resource "aws_route53_record" "www" {
  zone_id = aws_route53_zone.sealvo.zone_id
  name    = "www.sealvo.it.com"
  type    = "CNAME"
  ttl     = 600
  records = ["scaw9iz0.up.railway.app"]
}

resource "aws_route53_record" "apex_mx" {
  zone_id = aws_route53_zone.sealvo.zone_id
  name    = "sealvo.it.com"
  type    = "MX"
  ttl     = 600
  records = ["10 feedback-smtp.eu-west-1.amazonses.com"]
}

resource "aws_route53_record" "mail_mx" {
  zone_id = aws_route53_zone.sealvo.zone_id
  name    = "mail.sealvo.it.com"
  type    = "MX"
  ttl     = 600
  records = ["10 feedback-smtp.eu-north-1.amazonses.com"]
}

resource "aws_route53_record" "mail_txt" {
  zone_id = aws_route53_zone.sealvo.zone_id
  name    = "mail.sealvo.it.com"
  type    = "TXT"
  ttl     = 600
  records = ["v=spf1 include:amazonses.com ~all"]
}

resource "aws_route53_record" "dmarc" {
  zone_id = aws_route53_zone.sealvo.zone_id
  name    = "_dmarc.sealvo.it.com"
  type    = "TXT"
  ttl     = 600
  records = ["v=DMARC1; p=none;"]
}

resource "aws_route53_record" "dkim" {
  for_each = {
    pmpjllonf2xxprsgw2giuni5ubb23jxm = "pmpjllonf2xxprsgw2giuni5ubb23jxm.dkim.amazonses.com"
    xsi5grqns7wdkvws3cmvmhooigfvr2ho = "xsi5grqns7wdkvws3cmvmhooigfvr2ho.dkim.amazonses.com"
    xeur57zm3dczpcpt3p5mvqrtntgsd52m = "xeur57zm3dczpcpt3p5mvqrtntgsd52m.dkim.amazonses.com"
  }
  zone_id = aws_route53_zone.sealvo.zone_id
  name    = "${each.key}._domainkey.sealvo.it.com"
  type    = "CNAME"
  ttl     = 600
  records = [each.value]
}
