from django.apps import AppConfig


class AppConfig(AppConfig):
    name = 'app'

    def ready(self):
        # Guard against a corrupted Django install where BaseContext.__copy__
        # tries to write attributes on a super() object.
        try:
            from django.template.context import BaseContext

            original_copy = BaseContext.__copy__

            def _is_broken_copy_impl():
                probe = BaseContext()
                try:
                    copied = original_copy(probe)
                except Exception as err:
                    return 'dicts' in str(err) and 'super' in str(err)
                return isinstance(copied, super) or not hasattr(copied, 'dicts')

            if _is_broken_copy_impl():
                def _fixed_copy(self):
                    duplicate = object.__new__(self.__class__)
                    duplicate.__dict__ = self.__dict__.copy()
                    if hasattr(self, 'dicts'):
                        duplicate.dicts = self.dicts[:]
                    return duplicate

                BaseContext.__copy__ = _fixed_copy
        except Exception:
            # Startup should never fail due to this compatibility patch.
            pass
