                </td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
);
export const PageShell = ({ title, subtitle, children }) => (
  <div className="space-y-6">
    <div>
      <h1 className="text-3xl font-black tracking-tight text-slate-50">{title}</h1>
      {subtitle && <p className="mt-1 text-slate-400">{subtitle}</p>}
    </div>
    {children}
  </div>
);