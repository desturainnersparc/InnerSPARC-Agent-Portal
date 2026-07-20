import os

try:
    import sib_api_v3_sdk
    from sib_api_v3_sdk.rest import ApiException
except ImportError:
    sib_api_v3_sdk = None

    class ApiException(Exception):
        pass


def add_contact_to_brevo(email, first_name=""):
    """
    Add a contact to Brevo (Sendinblue) email marketing list.
    
    Args:
        email (str): Email address of the contact
        first_name (str): First name of the contact (optional)
    """
    if sib_api_v3_sdk is None:
        # Keep app startup and onboarding flow working when Brevo SDK is unavailable.
        print("Brevo SDK not installed; skipping contact sync.")
        return

    try:
        configuration = sib_api_v3_sdk.Configuration()
        configuration.api_key['api-key'] = os.getenv("BREVO_API_KEY")

        api_instance = sib_api_v3_sdk.ContactsApi(
            sib_api_v3_sdk.ApiClient(configuration)
        )
        contact = sib_api_v3_sdk.CreateContact(
            email=email,
            attributes={"FIRSTNAME": first_name},
            list_ids=[int(os.getenv("BREVO_LIST_ID", "3"))],
            update_enabled=True
        )
        api_instance.create_contact(contact)
    except ApiException as e:
        print(f"Brevo error: {e}")
    except Exception as e:
        print(f"Unexpected error adding contact to Brevo: {e}")
