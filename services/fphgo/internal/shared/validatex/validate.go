package validatex

import (
	"reflect"
	"strings"

	"github.com/go-playground/validator/v10"
)

// New returns a configured validator that uses json tag names in error paths.
func New() *validator.Validate {
	v := validator.New()
	v.RegisterTagNameFunc(func(fld reflect.StructField) string {
		name := strings.SplitN(fld.Tag.Get("json"), ",", 2)[0]
		if name == "" || name == "-" {
			return fld.Name
		}
		return name
	})
	return v
}
