#
# azure-tenant-setup.sh
#
# one-time commands to establish terraform azure automation
#

#
# insure installation of azure cli
az version

#
# login via cli - browser bounce-out, plus output of subscription details
az login

#
# set up service account against the subscription for terraform to use - loopool
az ad sp create-for-rbac --role="Contributor" --scopes="/subscriptions/0f3ecc7d-4f08-4175-8810-6075218e9f40"

#
# capture outputs as environment vars
export ARM_CLIENT_ID="c4075611-5387-4a09-9557-a97d02be2e0f"
export ARM_CLIENT_SECRET="ZYp8Q~FFZEncZYaD5TsoDyZtHLglvG1U2mUUubtR"
export ARM_SUBSCRIPTION_ID="0f3ecc7d-4f08-4175-8810-6075218e9f40"
export ARM_TENANT_ID="06be0db1-abb0-4568-9b99-4e95eef0b6aa"

#
# now work with terraform
terraform init

