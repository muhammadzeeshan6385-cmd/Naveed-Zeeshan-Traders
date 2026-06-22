      </div>
        <nav className="flex-1 space-y-1 overflow-y-auto">
          {visibleMenu.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`block w-full rounded-xl px-4 py-3 text-left text-sm font-medium transition ${
                activeTab === item.id
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <button
          type="button"
          onClick={handleLogout}
          className="mt-4 w-full rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-500"
        >
          Logout
        </button>
      </aside>
      <main className="flex-1 overflow-y-auto p-6 lg:p-8">{renderModule()}</main>
    </div>
  );
}
export default App;
export default App;
