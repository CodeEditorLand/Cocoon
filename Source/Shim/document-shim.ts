/*---------------------------------------------------------------------------------------------
 * Cocoon Document Shim Service (document-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements the `IExtHostDocumentsAndEditors` service interface (primarily focusing on
 * the `IExtHostDocuments` aspects for Cocoon's initial scope). It is responsible for
 * managing `TextDocument` data instances, representing open text documents within the
 * Cocoon environment, and synchronizing their state with the Mountain host process.
 *
 * - `CocoonDocumentService`:
 *   - Manages a collection of `CocoonDocumentData` instances, keyed by document URI.
 *   - Provides API methods like `getDocumentData()` (internal) and `getTextDocuments()` (for
 *     `vscode.workspace.textDocuments`).
 *   - Exposes `vscode.workspace` document lifecycle events (`onDidOpenTextDocument`, etc.)
 *     by firing its internal `VscodeEmitter` instances.
 *   - Implements RPC methods (as part of `ExtHostDocumentsShape` from `extHost.protocol.ts`)
 *     that are called by Mountain (e.g., `$acceptModelAdded`, `$acceptModelRemoved`,
 *     `$acceptModelChanged`) to update document states in Cocoon.
 * - `CocoonDocumentData`:
 *   - Represents the state of a single text document (URI, lines, version, language ID,
 *     dirty status, EOL, encoding).
 *   - Provides the actual `vscode.TextDocument` API facade that extensions interact with.
 *   - Handles the application of content changes received from Mountain via its
 *     `_acceptContentChangesInternal` method.
 *   - Its `save()` method proxies the save operation to Mountain via an RPC call
 *     (`$trySaveDocument`) on `MainThreadDocumentsShape`.
 *
 * Key Interactions:
 * - `CocoonDocumentService` is registered with DI in `Cocoon/index.ts` as `IExtHostDocuments`
 *   (and potentially `IExtHostDocumentsAndEditors`).
 * - Its `getTextDocuments()` and document lifecycle events are exposed via `vscode.workspace`.
 * - Receives document state updates from Mountain (e.js_WORD_REGEXP_FALLBACK = /(-?\d*\.\d\w*)|([^\`\~\!\@\#\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g;

if (!ensureValidWordDefinitionInternal) {
	ensureValidWordDefinitionInternal = (wordDefinition?: RegExp): RegExp => {
		let result: RegExp = DEFAULT_WORD_REGEXP_FALLBACK; // Default to fallback
		if (wordDefinition instanceof RegExp) {
			if (!wordDefinition.global) {
				let flags = "g"; // Ensure global flag for iterative matching
				if (wordDefinition.ignoreCase) flags += "i";
				if (wordDefinition.multiline) flags += "m";
				if (wordDefinition.unicode) flags += "u";
				// Add other flags if necessary (e.g., sticky 'y', dotAll 's')
				result = new RegExp(wordDefinition.source, flags);
			} else {
				result = wordDefinition;
			}
		}
		result.lastIndex = 0; // Reset lastIndex before use
		return result;
	};
}

// Placeholder for type converters, especially for Range.
// A real implementation would use or adapt from `vs/workbench/api/common/extHostTypeConverters.ts`.
const localTypeConverters = {
    Range: {
        to: (rangeDto: VscodeInternalRange | undefined): VscodeRange => {
            if (!rangeDto) return new VscodeRange(0,0,0,0); // Default for safety
            // Assuming rangeDto is { startLineNumber, startColumn, endLineNumber, endColumn } (1-based)
            // or { e, f, g, h } from minified sources.
            // This needs to match the DTO structure from RpcModelContentChange.range
            // Let's assume it's {startLineNumber, startColumn, endLineNumber, endColumn} (1-based from protocol)
            // and VscodeRange constructor expects 0-based.
            // OR, if rangeDto is already 0-based like IRange {startLineNumber,startColumn,endLineNumber,endColumn} from extHost.protocol:
            if ('startLineNumber' in rangeDto && 'startColumn' in rangeDto && 'endLineNumber' in rangeDto && 'endColumn' in rangeDto) {
                 return new VscodeRange(
                    rangeDto.startLineNumber, rangeDto.startColumn,
                    rangeDto.endLineNumber, rangeDto.endColumn
                );
            }
            // Fallback for older/different DTOs, this is risky and needs to match actual DTO
            console.warn("[DocumentShim TypeConverter] Unknown range DTO structure, attempting generic conversion", rangeDto);
            return new VscodeRange(
                (rangeDto as any).startLineNumber ?? (rangeDto as any).e ?? 0,
                (rangeDto as any).startColumn ?? (rangeDto as any).f ?? 0,
                (rangeDto as any).endLineNumber ?? (rangeDto as any).g ?? 0,
                (rangeDto as any).endColumn ?? (rangeDto as any).h ?? 0,
            );
        }
    }
};


// --- Type Definitions ---

/**
 * Defines the RPC interface for the `MainThreadDocuments` service expected on Mountain.
 * This subset includes methods relevant to this document shim.
 */
type MainThreadDocumentsProxyService = Pick<
	VscodeMainThreadDocumentsShape,
	"$tryCreateDocument" | "$tryOpenDocument" | "$trySaveDocument"
>;

/**
 * `CocoonDocumentService` manages text document data and provides document-related APIs and events.
 * It implements `VscodeExtHostDocumentsShape` to receive updates from the MainThread.
 */
export class CocoonDocumentService
	extends BaseCocoonShim
	implements VscodeExtHostDocumentsShape
{
	public readonly _serviceBrand: undefined; // For IExtHostDocuments/IExtHostDocumentsAndEditors DI

	readonly #mainThreadDocumentsProxy: MainThreadDocumentsProxyService | null =
		null;
	// Document cache: Key is VscodeApiUri.toString(), Value is CocoonDocumentData instance.
	readonly #documents = new Map<string, CocoonDocumentData>();

	// Event Emitters for vscode.workspace document events
	readonly #onDidAddDocumentEmitter = new VscodeEmitter<VscodeTextDocument>();
	readonly #onDidRemoveDocumentEmitter =
		new VscodeEmitter<VscodeTextDocument>();
	readonly #onDidChangeDocumentEmitter =
		new VscodeEmitter<VscodeTextDocumentChangeEvent>();
	readonly #onDidSaveDocumentEmitter =
		new VscodeEmitter<VscodeTextDocument>();

	/**
	 * Creates an instance of CocoonDocumentService.
	 * @param rpcService The RPC service adapter.
	 * @param logService The logging service.
	 */
	constructor(
		rpcService: IRpcProtocolServiceAdapter | undefined,
		logService: ILogServiceForShim | undefined,
	) {
		super("ExtHostDocuments", rpcService, logService); // Service ID for logging
		this._log("Initializing...");

		if (this._rpcService) {
			this.#mainThreadDocumentsProxy = this._getProxy(
				MainContext.MainThreadDocuments as ProxyIdentifier<MainThreadDocumentsProxyService>,
			);
			// Register self to handle RPC calls from MainThreadDocuments.
			try {
				this._rpcService.set(
					ExtHostContext.ExtHostDocuments as ProxyIdentifier<VscodeExtHostDocumentsShape>,
					this,
				);
				this._log(
					"Registered self for incoming RPC calls (ExtHostDocuments).",
				);
			} catch (e: any) {
				this._logError(
					"Failed to set self for RPC (ExtHostDocuments):",
					e,
				);
			}
		}
		if (!this.#mainThreadDocumentsProxy) {
			this._logError(
				"MainThreadDocuments RPC proxy NOT obtained. Document operations (save, create, open) will fail.",
			);
		}
	}

	/** Provides access to the MainThreadDocuments RPC proxy for `CocoonDocumentData`. */
	public getMainThreadDocumentsProxy(): MainThreadDocumentsProxyService | null {
		return this.#mainThreadDocumentsProxy;
	}

	// --- Internal API for other ExtHost services ---
	/**
	 * Retrieves the `CocoonDocumentData` for a given URI.
	 * @param uri The `vscode.Uri` of the document.
	 * @returns The `CocoonDocumentData` instance, or `undefined` if not found.
	 */
	public getDocumentData(uri: VscodeApiUri): CocoonDocumentData | undefined {
		if (!(uri instanceof VscodeApiUri)) {
			// Ensure input is of the expected API type
			this._logWarn(
				"getDocumentData called with non-VscodeApiUri instance:",
				uri,
			);
			return undefined;
		}
		return this.#documents.get(uri.toString());
	}

	/**
	 * Retrieves all managed `CocoonDocumentData` instances.
	 * @returns A readonly array of all `CocoonDocumentData` instances.
	 */
	public getAllDocumentData(): readonly CocoonDocumentData[] {
		return Object.freeze([...this.#documents.values()]);
	}

	// --- vscode.workspace API parts (exposed via ShimExtHostWorkspace) ---
	/**
	 * Gets all currently known text documents.
	 * @returns A readonly array of `vscode.TextDocument` objects.
	 */
	public getTextDocuments(): readonly VscodeTextDocument[] {
		return this.getAllDocumentData().map((docData) => docData.document);
	}

	public readonly onDidOpenTextDocument: VscodeEvent<VscodeTextDocument> =
		this.#onDidAddDocumentEmitter.event;
	public readonly onDidCloseTextDocument: VscodeEvent<VscodeTextDocument> =
		this.#onDidRemoveDocumentEmitter.event;
	public readonly onDidChangeTextDocument: VscodeEvent<VscodeTextDocumentChangeEvent> =
		this.#onDidChangeDocumentEmitter.event;
	public readonly onDidSaveTextDocument: VscodeEvent<VscodeTextDocument> =
		this.#onDidSaveDocumentEmitter.event;

	// --- RPC Methods ($accept... from VscodeExtHostDocumentsShape, called BY MainThread) ---

	/** {@inheritDoc VscodeExtHostDocumentsShape.$acceptModelAdded} */
	public $acceptModelAdded(
		uriComponents: VSCodeInternalUriComponents, // DTO from MainThread
		eol: string,
		versionId: number,
		lines: string[],
		languageId: string,
		isDirty: boolean,
		// encoding?: string, // Encoding was in original Cocoon shim, but not in standard RpcModelAddedData
		// For compatibility with potential custom protocol:
		_encoding_unused?: string, // Mark as unused if sticking to standard protocol
	): void {
		const revivedVscodeApiUri =
			this._reviveUriDtoToVscodeApiUri(uriComponents);
		if (!revivedVscodeApiUri) {
			this._logError(
				"$acceptModelAdded: Failed to revive URI from DTO.",
				uriComponents,
			);
			return;
		}
		const uriString = revivedVscodeApiUri.toString();
		if (this.#documents.has(uriString)) {
			this._logWarn(
				`$acceptModelAdded: Document with URI '${uriString}' already exists. Ignoring add notification.`,
			);
			return;
		}

		// this._log(`$acceptModelAdded: URI='${uriString}', Version=${versionId}, Lang='${languageId}', Dirty=${isDirty}, Lines=${lines.length}`);
		const documentData = new CocoonDocumentData(
			this, // Pass service instance
			revivedVscodeApiUri,
			lines,
			eol,
			languageId,
			versionId,
			isDirty,
			"utf8", // Default encoding if not provided by protocol; standard RpcModelAddedData doesn't include it
			this._logService,
		);
		this.#documents.set(uriString, documentData);
		this.#onDidAddDocumentEmitter.fire(documentData.document);
	}

	/** {@inheritDoc VscodeExtHostDocumentsShape.$acceptModelRemoved} */
	public $acceptModelRemoved(
		uriComponents: VSCodeInternalUriComponents,
	): void {
		const revivedVscodeApiUri =
			this._reviveUriDtoToVscodeApiUri(uriComponents);
		if (!revivedVscodeApiUri) {
			this._logError(
				"$acceptModelRemoved: Failed to revive URI from DTO.",
				uriComponents,
			);
			return;
		}
		const uriString = revivedVscodeApiUri.toString();
		const documentData = this.#documents.get(uriString);

		if (documentData) {
			// this._log(`$acceptModelRemoved: URI='${uriString}'`);
			documentData._markAsClosedInternal(); // Mark internal state as closed
			this.#documents.delete(uriString);
			this.#onDidRemoveDocumentEmitter.fire(documentData.document);
			dispose(documentData); // Dispose the CocoonDocumentData instance itself
		} else {
			this._logWarn(
				`$acceptModelRemoved: Document with URI '${uriString}' not found in local cache.`,
			);
		}
	}

	/** {@inheritDoc VscodeExtHostDocumentsShape.$acceptModelChanged} */
	public $acceptModelChanged(
		uriComponents: VSCodeInternalUriComponents,
		eventData: RpcModelChangedEvent,
		isDirty: boolean,
	): void {
		const revivedVscodeApiUri =
			this._reviveUriDtoToVscodeApiUri(uriComponents);
		if (!revivedVscodeApiUri) {
			this._logError(
				"$acceptModelChanged: Failed to revive URI from DTO.",
				uriComponents,
			);
			return;
		}
		const uriString = revivedVscodeApiUri.toString();
		const documentData = this.#documents.get(uriString);

		if (documentData) {
			// Version check: Apply changes only if the event's version ID is newer.
			if (documentData.version >= eventData.versionId) {
				this._logWarn(
					`$acceptModelChanged: Stale event (V${eventData.versionId}) for URI '${uriString}' (current V${documentData.version}). Updating dirty state only.`,
				);
				documentData._acceptIsDirtyInternal(isDirty); // Still update dirty flag as per VS Code logic
				return;
			}

			// this._log(`$acceptModelChanged: URI='${uriString}', NewVersion=${eventData.versionId}, Changes=${eventData.changes.length}, NewEOL='${eventData.eol}', IsDirty=${isDirty}`);

			const contentChanged = documentData._acceptContentChangesInternal(
				eventData.versionId,
				eventData.changes,
				eventData.eol,
			);
			const dirtinessChanged =
				documentData._acceptIsDirtyInternal(isDirty);

			if (!contentChanged && !dirtinessChanged) {
				// this._log(`$acceptModelChanged: No effective change applied for URI '${uriString}', V${eventData.versionId}.`);
				return; // No actual change to content or dirty state that needs an event.
			}

			// If content changed, fire the onDidChangeTextDocument event.
			// The API expects an array of VscodeTextDocumentContentChangeEvent.
			if (contentChanged) {
				const vscodeContentChanges: VscodeTextDocumentContentChangeEvent[] =
					eventData.changes.map((change) => ({
						range: localTypeConverters.Range.to(change.range), // Convert IRange DTO to vscode.Range
						rangeOffset: change.rangeOffset,
						rangeLength: change.rangeLength,
						text: change.text,
					}));

				this.#onDidChangeDocumentEmitter.fire(
					Object.freeze({
						document: documentData.document,
						contentChanges: Object.freeze(
							vscodeContentChanges,
						) as readonly VscodeTextDocumentContentChangeEvent[],
						reason: eventData.isUndoing
							? TextDocumentChangeReason.Undo
							: eventData.isRedoing
								? TextDocumentChangeReason.Redo
								: undefined, // Reason is optional
					}),
				);
			}
		} else {
			this._logWarn(
				`$acceptModelChanged: Document with URI '${uriString}' not found for update.`,
			);
		}
	}

	/** {@inheritDoc VscodeExtHostDocumentsShape.$acceptModelSaved} */
	public $acceptModelSaved(uriComponents: VSCodeInternalUriComponents): void {
		const revivedVscodeApiUri =
			this._reviveUriDtoToVscodeApiUri(uriComponents);
		if (!revivedVscodeApiUri) {
			this._logError(
				"$acceptModelSaved: Failed to revive URI from DTO.",
				uriComponents,
			);
			return;
		}
		const uriString = revivedVscodeApiUri.toString();
		const documentData = this.#documents.get(uriString);

		if (documentData) {
			// this._log(`$acceptModelSaved: URI='${uriString}'`);
			documentData._acceptIsDirtyInternal(false); // Saved implies not dirty
			this.#onDidSaveDocumentEmitter.fire(documentData.document);
			// Note: VS Code's full ExtHostDocumentData might also fire onDidChangeTextDocument if the dirty state change
			// is considered a document change for the API, even without content changes.
			// For simplicity here, only onDidSaveTextDocument is fired unless explicitly dirty state change also needs onDidChangeTextDocument.
		} else {
			this._logWarn(
				`$acceptModelSaved: Document with URI '${uriString}' not found.`,
			);
		}
	}

	/**
	 * (Custom method, not standard in VscodeExtHostDocumentsShape, but was in original Cocoon shim)
	 * Accepts a change in the dirty state of a model.
	 */
	public $acceptDirtyStateChanged(
		uriComponents: VSCodeInternalUriComponents,
		isDirty: boolean,
	): void {
		const revivedVscodeApiUri =
			this._reviveUriDtoToVscodeApiUri(uriComponents);
		if (!revivedVscodeApiUri) {
			this._logError(
				"$acceptDirtyStateChanged: Failed to revive URI from DTO.",
				uriComponents,
			);
			return;
		}
		const uriString = revivedVscodeApiUri.toString();
		const documentData = this.#documents.get(uriString);

		if (documentData) {
			// this._log(`$acceptDirtyStateChanged: URI='${uriString}' -> isDirty=${isDirty}`);
			const dirtinessActuallyChanged =
				documentData._acceptIsDirtyInternal(isDirty);
			if (dirtinessActuallyChanged) {
				// VS Code typically fires onDidChangeTextDocument if dirtiness *actually* changes,
				// even without content changes, as it's a state change of the document.
				this.#onDidChangeDocumentEmitter.fire(
					Object.freeze({
						document: documentData.document,
						contentChanges: Object.freeze(
							[],
						) as readonly VscodeTextDocumentContentChangeEvent[],
						reason: undefined, // No specific reason for just dirty state change from this RPC
					}),
				);
			}
		} else {
			this._logWarn(
				`$acceptDirtyStateChanged: Document with URI '${uriString}' not found.`,
			);
		}
	}

	/** {@inheritDoc VscodeExtHostDocumentsShape.$acceptModelLanguageChanged} */
	public $acceptModelLanguageChanged(
		uriComponents: VSCodeInternalUriComponents,
		newLanguageId: string,
	): void {
		const revivedVscodeApiUri =
			this._reviveUriDtoToVscodeApiUri(uriComponents);
		if (!revivedVscodeApiUri) {
			this._logError(
				"$acceptModelLanguageChanged: Failed to revive URI from DTO.",
				uriComponents,
			);
			return;
		}
		const uriString = revivedVscodeApiUri.toString();
		const documentData = this.#documents.get(uriString);
		if (documentData) {
			// this._log(`$acceptModelLanguageChanged: URI='${uriString}' from Lang='${documentData.languageId}' to '${newLanguageId}'`);
			const languageActuallyChanged =
				documentData._acceptLanguageIdInternal(newLanguageId);
			if (languageActuallyChanged) {
				// Firing onDidChangeTextDocument for language change is consistent with some VS Code behaviors,
				// as it's a significant metadata change of the document.
				this.#onDidChangeDocumentEmitter.fire(
					Object.freeze({
						document: documentData.document,
						contentChanges: Object.freeze(
							[],
						) as readonly VscodeTextDocumentContentChangeEvent[],
						reason: undefined,
					}),
				);
			}
		} else {
			this._logWarn(
				`$acceptModelLanguageChanged: Document with URI '${uriString}' not found.`,
			);
		}
	}

	/**
	 * (Custom method, not standard in VscodeExtHostDocumentsShape, but was in original Cocoon shim)
	 * Accepts a change in the encoding of a model.
	 */
	public $acceptEncodingChanged(
		uriComponents: VSCodeInternalUriComponents,
		newEncoding: string,
	): void {
		const revivedVscodeApiUri =
			this._reviveUriDtoToVscodeApiUri(uriComponents);
		if (!revivedVscodeApiUri) {
			this._logError(
				"$acceptEncodingChanged: Failed to revive URI from DTO.",
				uriComponents,
			);
			return;
		}
		const uriString = revivedVscodeApiUri.toString();
		const documentData = this.#documents.get(uriString);
		if (documentData) {
			this._log(
				`$acceptEncodingChanged: URI='${uriString}' from Encoding='${documentData.encoding}' to '${newEncoding}'`,
			);
			const encodingActuallyChanged =
				documentData._acceptEncodingInternal(newEncoding);
			if (encodingActuallyChanged) {
				// There's no standard vscode.TextDocument event specifically for encoding change.
				// This update is primarily for internal state consistency if other parts of Cocoon need it.
				// If this should trigger a general document change event, it could be fired here.
			}
		} else {
			this._logWarn(
				`$acceptEncodingChanged: Document with URI '${uriString}' not found.`,
			);
		}
	}

	// --- URI Conversion Helpers (DTO <-> VscodeApiUri) ---
	/** Converts URI components (from RPC) to a `vscode.Uri` (API type). */
	private _reviveUriDtoToVscodeApiUri(
		uriDto: VSCodeInternalUriComponents | undefined,
	): VscodeApiUri | undefined {
		if (!uriDto) return undefined;
		try {
			const internalUri = VSCodeInternalURI.revive(uriDto); // Revive to vs/base/common/uri.URI
			return VscodeApiUri.from(internalUri); // Convert to vscode.Uri (API type)
		} catch (e: any) {
			this._logError(
				"Failed to revive URI DTO to VscodeApiUri:",
				uriDto,
				e,
			);
			return undefined;
		}
	}

	/** Converts a `vscode.Uri` (API type) to URI components (DTO for RPC). */
	private _vscodeApiUriToDto(
		uri: VscodeApiUri,
	): VSCodeInternalUriComponents | undefined {
		// Use BaseCocoonShim's _convertApiArgToInternal, which should produce a DTO
		// compatible with VSCodeInternalUriComponents, potentially with $mid.
		const components = this._convertApiArgToInternal(uri);
		// Validate if the converted components look like a marshalled URI DTO
		if (
			components &&
			(components.$mid === MarshalledId.UriSimple ||
				components.$mid === MarshalledId.Uri ||
				(components.scheme && components.path))
		) {
			return components as VSCodeInternalUriComponents;
		}
		this._logError(
			"Failed to convert VscodeApiUri to DTO for RPC via base marshaller.",
			uri,
			"Resulting components:",
			components,
		);
		// Fallback: Manually construct if base marshaller isn't producing the exact internal DTO
		try {
			const internalUri = VSCodeInternalURI.from(uri); // Convert API URI to internal VS Code URI
			return {
				// Construct the DTO manually
				$mid: MarshalledId.UriSimple, // Or MarshalledId.Uri if full fidelity is always needed
				scheme: internalUri.scheme,
				authority: internalUri.authority,
				path: internalUri.path,
				query: internalUri.query,
				fragment: internalUri.fragment,
				// external: internalUri.toString(true), // Optional
				// fsPath: internalUri.fsPath,             // Optional
			};
		} catch (e: any) {
			// Catch errors during manual conversion too
			this._logError(
				"Fallback VscodeApiUri to DTO conversion also failed for URI:",
				uri,
				e,
			);
			return undefined;
		}
	}

	/** Disposes of resources held by this service. */
	public override dispose(): void {
		super.dispose(); // From BaseCocoonShim, handles _instanceDisposables
		this.#onDidAddDocumentEmitter.dispose();
		this.#onDidRemoveDocumentEmitter.dispose();
		this.#onDidChangeDocumentEmitter.dispose();
		this.#onDidSaveDocumentEmitter.dispose();
		dispose([...this.#documents.values()]); // Dispose all cached CocoonDocumentData instances
		this.#documents.clear();
		this._log("Disposed.");
	}
}

/**
 * `CocoonDocumentData` holds the state for a single text document and provides
 * the `vscode.TextDocument` API facade for it.
 */
export class CocoonDocumentData implements IDisposable {
	readonly #uriAdapter: VscodeApiUri; // vscode.Uri for the public API
	#linesInternal: string[];
	#eolInternal: string;
	#versionIdInternal: number;
	#languageIdInternal: string;
	#isDirtyInternal: boolean;
	#isClosedInternal = false;
	#encodingInternal: string; // Internal tracking of encoding
	#logService?: ILogServiceForShim;
	readonly #documentService: CocoonDocumentService; // Reference to the parent service
	#lineStartsInternal: number[] | null = null; // Cache for line start offsets

	/** The public `vscode.TextDocument` API object for this document data. */
	public readonly document: VscodeTextDocument;

	constructor(
		documentService: CocoonDocumentService, // Pass the service instance for operations like save
		uri: VscodeApiUri, // Use vscode.Uri for API consistency
		lines: string[],
		eol: string,
		languageId: string,
		versionId: number,
		isDirty: boolean,
		encoding: string, // Added encoding
		logService?: ILogServiceForShim,
	) {
		this.#documentService = documentService;
		this.#uriAdapter = uri;
		this.#linesInternal = lines;
		this.#eolInternal = eol;
		this.#languageIdInternal = languageId;
		this.#versionIdInternal = versionId;
		this.#isDirtyInternal = isDirty;
		this.#encodingInternal = encoding; // Store encoding
		this.#logService = logService;
		this.document = this._createTextDocumentApiObject(); // Create and freeze the API facade
		// this._logShimOp(`Created document data: URI='${this.#uriAdapter.toString()}', Version=${this.#versionIdInternal}`);
	}

	private _logShimOp(message: string, ...args: any[]): void {
		this.#logService?.trace(
			`[CocoonDocData][${this.#uriAdapter.fsPath || this.#uriAdapter.toString()}] ${message}`,
			...args,
		);
	}
	private _logShimError(message: string | Error, ...args: any[]): void {
		const prefix = `[CocoonDocData][${this.#uriAdapter.fsPath || this.#uriAdapter.toString()}]`;
		if (this.#logService) {
			this.#logService.error(
				message instanceof Error ? message : `${prefix} ${message}`,
				...args,
			);
		} else {
			if (message instanceof Error)
				console.error(
					`${prefix} ${message.message}`,
					message.stack,
					...args,
				);
			else console.error(`${prefix} ${message}`, ...args);
		}
	}
	private _logShimWarn(message: string, ...args: any[]): void {
		this.#logService?.warn(
			`[CocoonDocData][${this.#uriAdapter.fsPath || this.#uriAdapter.toString()}] ${message}`,
			...args,
		);
	}

	// --- Internal state update methods called by CocoonDocumentService ---
	public _acceptLanguageIdInternal(newLanguageId: string): boolean {
		if (this.#languageIdInternal !== newLanguageId) {
			this.#languageIdInternal = newLanguageId;
			return true; // Indicates a change occurred
		}
		return false;
	}
	public _acceptIsDirtyInternal(newIsDirty: boolean): boolean {
		if (this.#isDirtyInternal !== newIsDirty) {
			this.#isDirtyInternal = newIsDirty;
			return true;
		}
		return false;
	}
	public _acceptEncodingInternal(newEncoding: string): boolean {
		// New method for encoding
		if (this.#encodingInternal !== newEncoding) {
			this.#encodingInternal = newEncoding;
			return true;
		}
		return false;
	}
	public _markAsClosedInternal(): void {
		this.#isClosedInternal = true;
	}

	/** Applies content changes received from the MainThread. */
	public _acceptContentChangesInternal(
		newVersionId: number,
		changes: RpcModelContentChange[],
		newEol: string,
	): boolean {
		if (
			this.#versionIdInternal >= newVersionId &&
			newVersionId !== -1 /* -1 can be force override */
		) {
			// this._logShimOp(`Skipping content changes for V${newVersionId} (current V${this.#versionIdInternal}). EOL change still possible.`);
			// Even if version is stale for content, EOL might change.
			if (this.#eolInternal !== newEol) {
				this.#eolInternal = newEol;
				this.#lineStartsInternal = null; // EOL change invalidates offsets
				return true; // EOL changed
			}
			return false; // No content change applied
		}

		this.#lineStartsInternal = null; // Invalidate offset cache due to content change
		this.#eolInternal = newEol; // Update EOL first, as it affects line splitting for inserts

		let currentLinesSnapshot = [...this.#linesInternal]; // Work on a mutable copy

		// RpcModelContentChange.range is IRange {startLineNumber,startColumn,endLineNumber,endColumn} (0-based from protocol)
		// These changes are already ordered correctly by the main thread (non-overlapping or sequential).
		for (const change of changes) {
			const vscodeRange = new VscodeRange( // Convert 0-based protocol range to 0-based API VscodeRange
				change.range.startLineNumber,
				change.range.startColumn,
				change.range.endLineNumber,
				change.range.endColumn,
			);
			const textToInsert = change.text;
			currentLinesSnapshot = this._applyDeleteRangeApi(
				currentLinesSnapshot,
				vscodeRange,
			);
			currentLinesSnapshot = this._applyInsertTextApi(
				currentLinesSnapshot,
				vscodeRange.start,
				textToInsert,
			);
		}

		this.#linesInternal = currentLinesSnapshot;
		this.#versionIdInternal = newVersionId;
		return true; // Content changed
	}

	// Helper methods for applying changes, taking VscodeRange/VscodePosition (0-based)
	private _applyDeleteRangeApi(
		lines: string[],
		range: VscodeRange,
	): string[] {
		if (range.isEmpty) return lines;
		const currentDocLines = [...lines]; // Operate on a copy
		const { start, end } = range;

		if (start.line === end.line) {
			// Single-line deletion
			const lineText = currentDocLines[start.line];
			currentDocLines[start.line] =
				lineText.substring(0, start.character) +
				lineText.substring(end.character);
		} else {
			// Multi-line deletion
			const firstLineText = currentDocLines[start.line];
			const lastLineText = currentDocLines[end.line];
			// Content after deletion point on start line + content before deletion point on end line
			currentDocLines[start.line] =
				firstLineText.substring(0, start.character) +
				lastLineText.substring(end.character);
			// Remove intermediate lines and the end line (which is now merged into start.line)
			currentDocLines.splice(start.line + 1, end.line - start.line);
		}
		return currentDocLines;
	}
	private _applyInsertTextApi(
		lines: string[],
		position: VscodePosition,
		text: string,
	): string[] {
		if (!text) return lines;
		const currentDocLines = [...lines]; // Operate on a copy
		const { line, character } = position;

		// Normalize newlines in the text to be inserted to match the document's EOL.
		const normalizedTextToInsert = text.replace(
			/\r\n|\n|\r/g,
			this.#eolInternal,
		);
		const insertTextLines = splitLines(normalizedTextToInsert); // Use VS Code utility

		if (insertTextLines.length === 1) {
			// Single-line insert
			const lineText = currentDocLines[line];
			currentDocLines[line] =
				lineText.substring(0, character) +
				insertTextLines[0] +
				lineText.substring(character);
		} else {
			// Multi-line insert
			const lineText = currentDocLines[line];
			const textAfterInsertPointOnOriginalLine =
				lineText.substring(character);
			// First line of insert replaces content from insertion point
			currentDocLines[line] =
				lineText.substring(0, character) + insertTextLines[0];
			// Remaining lines to insert
			const subsequentLinesToInsert = insertTextLines.slice(1);
			// Last line of insert needs to be prepended to the text that was after the insertion point on original line
			subsequentLinesToInsert[subsequentLinesToInsert.length - 1] +=
				textAfterInsertPointOnOriginalLine;
			// Splice in the new lines
			currentDocLines.splice(line + 1, 0, ...subsequentLinesToInsert);
		}
		return currentDocLines;
	}

	// --- Line Start Offset Cache ---
	#ensureLineStartsAvailable(): void {
		if (this.#lineStartsInternal === null) {
			const eolCharacterLength = this.#eolInternal.length;
			let currentOffset = 0;
			const R: number[] = [0]; // Offset of the first line is always 0
			for (let i = 0; i < this.#linesInternal.length - 1; i++) {
				// Iterate up to second to last line for EOL
				currentOffset +=
					this.#linesInternal[i].length + eolCharacterLength;
				R.push(currentOffset);
			}
			// Add offset for the start of the last line if there's more than one line
			if (this.#linesInternal.length > 1) {
				// No EOL after the last line for offset calculation purposes
			} else if (
				this.#linesInternal.length === 1 &&
				this.#linesInternal[0].length === 0
			) {
				// If only one empty line, offset remains [0]
			} else if (this.#linesInternal.length === 1) {
				// Only one line, no further offsets after the first one.
				// The length of the document is lines[0].length.
				// The offset of a hypothetical line 2 would be lines[0].length + eolCharacterLength.
				// R would be [0, lines[0].length + eolCharacterLength] but positionAt should handle this.
			}
			this.#lineStartsInternal = R;
		}
	}

	// --- vscode.TextDocument API Implementation ---
	private _createTextDocumentApiObject(): VscodeTextDocument {
		const self = this; // Capture 'this' (CocoonDocumentData instance) for getters
		const textDoc: VscodeTextDocument = {
			get uri() {
				return self.#uriAdapter;
			},
			get fileName() {
				return self.#uriAdapter.fsPath;
			}, // fsPath is correct for file URIs
			get isUntitled() {
				return (
					self.#uriAdapter.scheme === Schemas.untitled ||
					self.#uriAdapter.scheme === Schemas.vscodeInteractiveInput
				);
			},
			get languageId() {
				return self.#languageIdInternal;
			},
			get version() {
				return self.#versionIdInternal;
			},
			get isClosed() {
				return self.#isClosedInternal;
			},
			get isDirty() {
				return self.#isDirtyInternal;
			},
			get eol() {
				return self.#eolInternal === "\n"
					? VscodeEndOfLine.LF
					: VscodeEndOfLine.CRLF;
			},
			get lineCount() {
				return self.#linesInternal.length;
			},

			save: async (): Promise<boolean> => {
				if (self.#isClosedInternal) {
					self._logShimError(
						"Document.save() called on a closed document.",
					);
					return false; // Or throw, API usually returns boolean
				}
				const proxy =
					self.#documentService.getMainThreadDocumentsProxy();
				if (!proxy) {
					self._logShimError(
						"Cannot save document: MainThreadDocuments RPC proxy unavailable.",
					);
					return false;
				}
				try {
					// Convert vscode.Uri (API type) to DTO (VSCodeInternalUriComponents) for RPC.
					const uriDto = (
						self.#documentService as any as BaseCocoonShim
					)._convertApiArgToInternal(self.#uriAdapter);
					if (!uriDto) {
						self._logShimError(
							"Failed to convert document URI to DTO for save operation.",
						);
						return false;
					}
					const success = await proxy.$trySaveDocument(uriDto);
					// MainThread will call $acceptModelSaved which updates dirty flag and fires event.
					return success;
				} catch (e: any) {
					self._logShimError(
						"Error during document save proxy call:",
						refineErrorForShim(e, self.#logService),
					);
					return false; // API usually returns boolean
				}
			},

			lineAt: (
				lineOrPosition: number | VscodePosition,
			): VscodeTextLine => {
				const lineIndex =
					typeof lineOrPosition === "number"
						? lineOrPosition
						: lineOrPosition.line;
				if (lineIndex < 0 || lineIndex >= self.#linesInternal.length) {
					throw new RangeError(
						`Illegal value for line number: ${lineIndex}. Must be between 0 and ${self.#linesInternal.length - 1}.`,
					);
				}
				const lineText = self.#linesInternal[lineIndex];
				const range = new VscodeRange(
					lineIndex,
					0,
					lineIndex,
					lineText.length,
				);
				const rangeIncludingLineBreak =
					lineIndex < self.#linesInternal.length - 1
						? new VscodeRange(lineIndex, 0, lineIndex + 1, 0)
						: range; // Last line has no line break in its rangeIncludingLineBreak end
				const firstNonWhitespaceCharacterIndex =
					lineText.match(/^\s*/)?.[0].length ?? 0;

				return Object.freeze({
					lineNumber: lineIndex,
					text: lineText,
					range,
					rangeIncludingLineBreak,
					firstNonWhitespaceCharacterIndex,
					isEmptyOrWhitespace:
						firstNonWhitespaceCharacterIndex === lineText.length,
				});
			},

			offsetAt: (position: VscodePosition): number => {
				position = self._validatePositionApi(position); // Ensure position is valid
				self.#ensureLineStartsAvailable();
				if (!self.#lineStartsInternal)
					throw new Error(
						"Internal error: Line starts cache not available.",
					); // Should not happen
				if (position.line >= self.#lineStartsInternal.length) {
					// Position is beyond the last known line start
					// Calculate offset based on the end of the document
					let totalOffset =
						self.#lineStartsInternal[
							self.#lineStartsInternal.length - 1
						];
					for (
						let i = self.#lineStartsInternal.length - 1;
						i < position.line;
						i++
					) {
						totalOffset +=
							self.#linesInternal[i].length +
							self.#eolInternal.length;
					}
					totalOffset += position.character;
					return Math.min(totalOffset, self.getText().length); // Cap at document length
				}
				return (
					self.#lineStartsInternal[position.line] + position.character
				);
			},

			positionAt: (offset: number): VscodePosition => {
				offset = Math.max(0, Math.floor(offset));
				self.#ensureLineStartsAvailable();
				if (!self.#lineStartsInternal)
					throw new Error(
						"Internal error: Line starts cache not available.",
					);

				let low = 0,
					high = self.#lineStartsInternal.length,
					mid = 0,
					lineStartOffset = 0;
				// Binary search to find the line index
				while (low < high) {
					mid = low + Math.floor((high - low) / 2);
					lineStartOffset = self.#lineStartsInternal[mid];
					if (offset >= lineStartOffset) {
						low = mid + 1;
					} else {
						high = mid;
					}
				}
				// `low` is now 1 + the index of the line containing the offset, or lines.length if offset is past the end.
				const lineIndex = Math.max(0, low - 1);
				if (lineIndex >= self.#linesInternal.length) {
					// Offset is beyond the document content
					const lastLine = self.#linesInternal.length - 1;
					return new VscodePosition(
						lastLine,
						self.#linesInternal[lastLine]?.length ?? 0,
					);
				}

				lineStartOffset = self.#lineStartsInternal[lineIndex];
				const character = Math.min(
					offset - lineStartOffset,
					self.#linesInternal[lineIndex]?.length ?? 0, // Cap character at line length
				);
				return new VscodePosition(lineIndex, character);
			},

			getText: (range?: VscodeRange): string => {
				if (!range) return self.#linesInternal.join(self.#eolInternal); // Full document text
				range = self._validateRangeApi(range); // Ensure range is valid
				if (range.isEmpty) return "";

				const { start, end } = range;
				if (start.line === end.line) {
					// Single-line range
					return self.#linesInternal[start.line].substring(
						start.character,
						end.character,
					);
				}
				// Multi-line range
				const resultLines: string[] = [
					self.#linesInternal[start.line].substring(start.character),
				];
				for (let i = start.line + 1; i < end.line; i++) {
					resultLines.push(self.#linesInternal[i]);
				}
				resultLines.push(
					self.#linesInternal[end.line].substring(0, end.character),
				);
				return resultLines.join(self.#eolInternal);
			},

			getWordRangeAtPosition: (
				position: VscodePosition,
				regex?: RegExp,
			): VscodeRange | undefined => {
				position = self._validatePositionApi(position);
				const lineText = self.#linesInternal[position.line];
				if (!lineText) return undefined; // Should not happen if position is validated

				const wordDefinition =
					ensureValidWordDefinitionInternal!(regex); // Use ensured (non-null) helper

				if (getWordAtTextInternal) {
					// Use VS Code's helper if available
					try {
						// VS Code's getWordAtText expects 1-based column, and returns 1-based columns.
						const wordAt = getWordAtTextInternal(
							position.character + 1,
							wordDefinition,
							lineText,
							0,
						);
						if (wordAt) {
							return new VscodeRange(
								position.line,
								wordAt.startColumn - 1,
								position.line,
								wordAt.endColumn - 1,
							);
						}
					} catch (e: any) {
						self._logShimError(
							"Error using internal getWordAtText for getWordRangeAtPosition:",
							e,
						);
						// Fallback to simpler regex match if internal helper fails
					}
				}

				// Fallback regex logic (if getWordAtTextInternal is not available or failed)
				wordDefinition.lastIndex = 0; // Reset regex state
				let match: RegExpExecArray | null;
				while ((match = wordDefinition.exec(lineText))) {
					const startIndex = match.index;
					const endIndex = startIndex + match[0].length;
					if (
						startIndex <= position.character &&
						endIndex >= position.character
					) {
						return new VscodeRange(
							position.line,
							startIndex,
							position.line,
							endIndex,
						);
					}
					if (
						wordDefinition.lastIndex === startIndex &&
						match[0].length === 0
					)
						break; // Avoid infinite loop on empty match
				}
				return undefined;
			},

			validateRange: (range: VscodeRange): VscodeRange =>
				self._validateRangeApi(range),
			validatePosition: (position: VscodePosition): VscodePosition =>
				self._validatePositionApi(position),
		};
		return Object.freeze(textDoc); // Ensure the API object is immutable
	}

	// --- Validation helpers using VscodePosition/VscodeRange (0-based) ---
	private _validatePositionApi(position: VscodePosition): VscodePosition {
		if (!(position instanceof VscodePosition))
			throw new TypeError("Invalid argument: Not a VscodePosition");
		let { line, character } = position;
		let changed = false;

		if (line < 0) {
			line = 0;
			character = 0;
			changed = true;
		}
		const lineCount = this.#linesInternal.length;
		if (line >= lineCount) {
			line = Math.max(0, lineCount - 1); // Clamp to last line index or 0 if empty
			character = this.#linesInternal[line]?.length ?? 0; // End of that line
			changed = true;
		} else {
			const maxCharacter = this.#linesInternal[line].length;
			if (character < 0) {
				character = 0;
				changed = true;
			}
			if (character > maxCharacter) {
				character = maxCharacter;
				changed = true;
			}
		}
		return changed ? new VscodePosition(line, character) : position;
	}
	private _validateRangeApi(range: VscodeRange): VscodeRange {
		if (!(range instanceof VscodeRange))
			throw new TypeError("Invalid argument: Not a VscodeRange");
		const start = this._validatePositionApi(range.start);
		const end = this._validatePositionApi(range.end);
		if (start === range.start && end === range.end) return range; // No change
		return new VscodeRange(start, end);
	}

	// --- Public getters for CocoonDocumentService (used by constructor) ---
	get uri(): VscodeApiUri {
		return this.#uriAdapter;
	}
	get version(): number {
		return this.#versionIdInternal;
	}
	get languageId(): string {
		return this.#languageIdInternal;
	}
	get encoding(): string {
		return this.#encodingInternal;
	} // Expose encoding

	/** Disposes of resources held by this document data instance. */
	public dispose(): void {
		// this._logShimOp(`Disposing document data for URI='${this.#uriAdapter.toString()}'`);
		// No specific resources (like event listeners) are held directly by CocoonDocumentData instance itself
		// that require explicit disposal beyond what garbage collection handles, once it's removed from the cache.
	}
}
