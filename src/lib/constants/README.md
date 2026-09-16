# Shared vocabularies

Every closed set of strings the API accepts or returns, defined once.

These mirror `src/shared/constants/` in the `cable-backend` repo, which is where
the database columns and the route validators take the same lists from. Two
repositories cannot import from each other, so the guard against drift is that
each file here names its counterpart — change one, change both, and the API's
own validation is what catches it if you do not.

Types are derived from the arrays (`(typeof X)[number]`), never written out by
hand, so a value can only be added in one place.
