SHELL := /bin/bash

JEKYLL_BUNDLE := bundle exec
JEKYLL := $(JEKYLL_BUNDLE) jekyll
RUBY_BUNDLE := bundle

.PHONY: help init serve build clean validate validate-strict recent touch commit new doc check quality prepublish publish

help:
	@echo ""
	@echo "Available targets:"
	@echo "  make init                              - install Ruby gems"
	@echo "  make serve                             - run local Jekyll server"
	@echo "  make build                             - build site"
	@echo "  make clean                             - clean generated site"
	@echo "  make validate                          - validate document metadata (errors only)"
	@echo "  make validate-strict                   - validate document metadata (warnings fail)"
	@echo "  make check                             - validate + build"
	@echo "  make quality                           - strict quality validation + build"
	@echo "  make prepublish                        - strict validation + build only"
	@echo "  make publish MSG=...                   - validate, build, commit, push"
	@echo "  make recent                            - show recently changed docs"
	@echo "  make new DOC_PATH=... TITLE=... TEMPLATE=... - create a new doc"
	@echo "  make touch FILE=...                    - update updated_at/sort_date"
	@echo "  make commit FILE=... MSG=...           - touch and commit one doc"
	@echo "  make doc DOC_PATH=... TITLE=... TEMPLATE=... MSG=... - create doc, validate, add, commit"
	@echo ""

init:
	$(RUBY_BUNDLE) install

serve:
	$(JEKYLL) serve

build:
	$(JEKYLL) build

clean:
	$(JEKYLL) clean

validate:
	python3 tools/validate_docs.py

validate-strict:
	python3 tools/validate_docs_strict.py

check:
	python3 tools/validate_docs.py
	$(JEKYLL) build

quality:
	python3 tools/validate_docs_strict.py
	$(JEKYLL) build

prepublish:
	./tools/prepublish.sh

publish:
	@if [ -z "$(MSG)" ]; then \
		echo 'Usage: make publish MSG="commit message"'; \
		exit 1; \
	fi
	./tools/publish.sh "$(MSG)"

recent:
	@git ls-files '*.md' | xargs -I{} stat -f '%m %N' {} 2>/dev/null | sort -rn | head -20 | cut -d' ' -f2-

new:
	@if [ -z "$(DOC_PATH)" ] || [ -z "$(TITLE)" ]; then \
		echo 'Usage: make new DOC_PATH=_foundations/.../ TITLE="Document Title" [TEMPLATE=concept]'; \
		exit 1; \
	fi
	./tools/new_doc.sh "$(DOC_PATH)" "$(TITLE)" "$(if $(TEMPLATE),$(TEMPLATE),concept)"

touch:
	@if [ -z "$(FILE)" ]; then \
		echo 'Usage: make touch FILE=_foundations/.../file.md'; \
		exit 1; \
	fi
	./tools/touch_doc.sh "$(FILE)"

commit:
	@if [ -z "$(FILE)" ] || [ -z "$(MSG)" ]; then \
		echo 'Usage: make commit FILE=_foundations/.../file.md MSG="commit message"'; \
		exit 1; \
	fi
	./tools/doc_commit.sh "$(FILE)" "$(MSG)"

doc:
	@if [ -z "$(DOC_PATH)" ] || [ -z "$(TITLE)" ] || [ -z "$(MSG)" ]; then \
		echo 'Usage: make doc DOC_PATH=_foundations/.../ TITLE="Document Title" [TEMPLATE=concept] MSG="commit message"'; \
		exit 1; \
	fi
	./tools/new_doc.sh "$(DOC_PATH)" "$(TITLE)" "$(if $(TEMPLATE),$(TEMPLATE),concept)"
	python3 tools/validate_docs.py
	git add .
	git commit -m "$(MSG)"
